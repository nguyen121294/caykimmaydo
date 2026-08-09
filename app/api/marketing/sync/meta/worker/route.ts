export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { prisma } from '@/lib/prisma';
import { publishSyncJob, SyncJobMessage } from '@/lib/qstash-sync';
import {
  getTokenForPlatform,
  syncFacebookAds,
  syncFacebookPage,
  syncInstagram,
  syncPostAdsInsights,
  SyncLog,
} from '@/lib/sync-meta-utils';

async function publishCurrentRevision(jobId: string) {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Không tìm thấy SyncJob để tiếp tục.');
  const messageId = await publishSyncJob({ jobId: job.id, revision: job.revision });
  await prisma.syncJob.update({ where: { id: job.id }, data: { messageId } });
}

async function continueJob(jobId: string, stage: string, cursor: string | null, fetched: number, saved: number) {
  const job = await prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: 'CONTINUING',
      stage,
      cursor,
      recordsFetched: { increment: fetched },
      recordsSaved: { increment: saved },
      revision: { increment: 1 },
      error: null,
    },
  });
  const messageId = await publishSyncJob({ jobId: job.id, revision: job.revision });
  await prisma.syncJob.update({ where: { id: job.id }, data: { messageId } });
}

async function startNextJob(groupId: string, sequence: number) {
  const nextJob = await prisma.syncJob.findFirst({
    where: { groupId, sequence: { gt: sequence }, status: 'QUEUED' },
    orderBy: { sequence: 'asc' },
  });
  if (!nextJob) return;
  const messageId = await publishSyncJob({ jobId: nextJob.id, revision: nextJob.revision });
  await prisma.syncJob.update({ where: { id: nextJob.id }, data: { messageId } });
}

async function finishJob(jobId: string, log: SyncLog | { fetched: number; saved: number }) {
  const fetched = 'recordsFetched' in log ? log.recordsFetched : log.fetched;
  const saved = 'recordsSaved' in log ? log.recordsSaved : log.saved;
  const job = await prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: 'SUCCESS',
      stage: 'COMPLETE',
      cursor: null,
      recordsFetched: { increment: fetched },
      recordsSaved: { increment: saved },
      completedAt: new Date(),
      error: null,
    },
  });
  await prisma.automationLog.create({
    data: {
      level: 'info',
      source: `sync-meta-worker/${job.platform}`,
      message: `Đồng bộ ${job.platform} hoàn tất: ${job.recordsFetched} lấy về, ${job.recordsSaved} đã lưu`,
      details: JSON.stringify({ jobId: job.id, groupId: job.groupId, fetched: job.recordsFetched, saved: job.recordsSaved }),
    },
  });
  await startNextJob(job.groupId, job.sequence);
}

async function runJob(jobId: string) {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('SyncJob không tồn tại.');

  const { token, pageId, adAccountId, igAccountId } = await getTokenForPlatform(job.platform);
  if (!token) throw new Error(`${job.platform}: chưa có token hợp lệ hoặc không thể giải mã token.`);

  if (job.platform === 'Facebook Page') {
    const log = await syncFacebookPage(token, pageId, job.days);
    if (log.error) throw new Error(log.error);
    await finishJob(job.id, log);
    return;
  }

  if (job.platform === 'Instagram') {
    const log = await syncInstagram(token, igAccountId, job.days);
    if (log.error) throw new Error(log.error);
    await finishJob(job.id, log);
    return;
  }

  if (job.platform !== 'Facebook Ads') throw new Error(`Platform không được hỗ trợ: ${job.platform}`);

  if (job.stage === 'START' || job.stage === 'CAMPAIGNS') {
    const log = await syncFacebookAds(token, adAccountId, job.days, {
      batch: true,
      cursor: job.cursor || undefined,
      pageLimit: 1,
      skipPostAds: true,
    });
    if (log.error) throw new Error(log.error);
    if (log.progress?.hasMore && log.progress.cursor) {
      await continueJob(job.id, 'CAMPAIGNS', log.progress.cursor, log.recordsFetched, log.recordsSaved);
    } else {
      await continueJob(job.id, 'POST_ADS', null, log.recordsFetched, log.recordsSaved);
    }
    return;
  }

  if (job.stage === 'POST_ADS') {
    const progress = await syncPostAdsInsights(token, adAccountId, job.days, {
      batch: true,
      cursor: job.cursor || undefined,
      pageLimit: 1,
    });
    const result = progress || { fetched: 0, saved: 0, complete: true, hasMore: false };
    if (result.hasMore && result.cursor) {
      await continueJob(job.id, 'POST_ADS', result.cursor, result.fetched, result.saved);
    } else {
      await finishJob(job.id, result);
    }
    return;
  }

  throw new Error(`Stage không hợp lệ: ${job.stage}`);
}

async function handler(req: NextRequest) {
  let message: SyncJobMessage | null = null;
  try {
    message = await req.json();
    if (!message?.jobId || !Number.isInteger(message.revision)) {
      return NextResponse.json({ success: false, error: 'Payload QStash không hợp lệ.' }, { status: 400 });
    }

    const existing = await prisma.syncJob.findUnique({ where: { id: message.jobId } });
    if (!existing) return NextResponse.json({ success: false, error: 'SyncJob không tồn tại.' }, { status: 404 });

    if (existing.status === 'SUCCESS') {
      await startNextJob(existing.groupId, existing.sequence);
      return NextResponse.json({ success: true, duplicate: true, status: existing.status });
    }
    if (existing.status === 'FAILED') {
      await startNextJob(existing.groupId, existing.sequence);
      return NextResponse.json({ success: true, ignored: true, status: existing.status });
    }
    if (existing.status === 'RUNNING') {
      const runningForMs = Date.now() - existing.updatedAt.getTime();
      if (runningForMs < 75_000) {
        return NextResponse.json(
          { success: false, retry: true, status: existing.status, error: 'Job trước vẫn đang giữ worker lock.' },
          { status: 409 }
        );
      }
      await prisma.syncJob.updateMany({
        where: { id: existing.id, revision: existing.revision, status: 'RUNNING', updatedAt: existing.updatedAt },
        data: { status: 'QUEUED', error: 'Worker trước hết thời gian; QStash đang chạy lại batch.' },
      });
    }
    if (message.revision !== existing.revision) {
      if (message.revision < existing.revision && existing.status === 'CONTINUING') {
        await publishCurrentRevision(existing.id);
      }
      return NextResponse.json({ success: true, stale: true, status: existing.status });
    }

    const claimed = await prisma.syncJob.updateMany({
      where: { id: existing.id, revision: message.revision, status: { in: ['QUEUED', 'CONTINUING'] } },
      data: {
        status: 'RUNNING',
        attempts: { increment: 1 },
        startedAt: existing.startedAt || new Date(),
        error: null,
      },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ success: true, duplicate: true, status: existing.status });
    }

    await runJob(existing.id);
    return NextResponse.json({ success: true, jobId: existing.id });
  } catch (error: any) {
    const errorMessage = error?.message || 'Worker Meta thất bại.';
    if (message?.jobId) {
      const retried = Number(req.headers.get('upstash-retried') || 0);
      const terminal = retried >= 3;
      const current = await prisma.syncJob.findUnique({ where: { id: message.jobId } }).catch(() => null);
      const continuationWasSaved = Boolean(current && current.revision > message.revision);
      const job = current?.status === 'SUCCESS'
        ? current
        : await prisma.syncJob.update({
            where: { id: message.jobId },
            data: {
              status: terminal ? 'FAILED' : (continuationWasSaved ? 'CONTINUING' : 'QUEUED'),
              error: errorMessage,
              completedAt: terminal ? new Date() : null,
            },
          }).catch(() => null);
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: `sync-meta-worker/${job?.platform || 'unknown'}`,
          message: `Lỗi đồng bộ: ${errorMessage}`,
          details: JSON.stringify({ jobId: message.jobId, retried, terminal }),
        },
      }).catch(() => undefined);
      if (terminal && job && job.status === 'FAILED') {
        await startNextJob(job.groupId, job.sequence).catch(() => undefined);
      }
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
