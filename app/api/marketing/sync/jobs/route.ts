export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { publishSyncJob } from '@/lib/qstash-sync';

const STALE_RUNNING_MS = 45_000;

async function recoverStaleJobs(groupId?: string | null, jobId?: string | null) {
  const cutoff = new Date(Date.now() - STALE_RUNNING_MS);
  const staleJobs = await prisma.syncJob.findMany({
    where: {
      ...(groupId ? { groupId } : { id: jobId || undefined }),
      status: 'RUNNING',
      updatedAt: { lt: cutoff },
    },
  });

  for (const staleJob of staleJobs) {
    if (staleJob.attempts >= 4) {
      await prisma.syncJob.update({
        where: { id: staleJob.id },
        data: {
          status: 'FAILED',
          error: 'Tác vụ bị timeout serverless quá 4 lần; vui lòng thử lại với khoảng thời gian ngắn hơn.',
          completedAt: new Date(),
        },
      });
      await prisma.automationLog.create({
        data: {
          level: 'error',
          source: `sync-job-recovery/${staleJob.platform}`,
          message: `Hủy job ${staleJob.id} do timeout quá 4 lần`,
          details: JSON.stringify({ jobId: staleJob.id, groupId: staleJob.groupId, attempts: staleJob.attempts }),
        },
      });
      continue;
    }

    const claimed = await prisma.syncJob.updateMany({
      where: { id: staleJob.id, status: 'RUNNING', revision: staleJob.revision, updatedAt: staleJob.updatedAt },
      data: {
        status: 'CONTINUING',
        revision: { increment: 1 },
        error: 'Worker bị timeout; hệ thống đang tự động khôi phục batch.',
      },
    });
    if (claimed.count === 0) continue;

    const recovered = await prisma.syncJob.findUnique({ where: { id: staleJob.id } });
    if (!recovered) continue;
    try {
      const messageId = await publishSyncJob({ jobId: recovered.id, revision: recovered.revision });
      await prisma.syncJob.update({ where: { id: recovered.id }, data: { messageId } });
      await prisma.automationLog.create({
        data: {
          level: 'warning',
          source: `sync-job-recovery/${recovered.platform}`,
          message: `Khôi phục job ${recovered.id} sau khi worker bị timeout`,
          details: JSON.stringify({ jobId: recovered.id, groupId: recovered.groupId, revision: recovered.revision, messageId }),
        },
      });
    } catch (error: any) {
      await prisma.syncJob.update({
        where: { id: recovered.id },
        data: { status: 'FAILED', error: `Không thể publish lại QStash: ${error?.message || 'Unknown'}`, completedAt: new Date() },
      });
    }
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });

  const groupId = req.nextUrl.searchParams.get('groupId');
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!groupId && !jobId) {
    return NextResponse.json({ error: 'Thiếu groupId hoặc jobId.' }, { status: 400 });
  }

  await recoverStaleJobs(groupId, jobId);

  const jobs = await prisma.syncJob.findMany({
    where: groupId ? { groupId } : { id: jobId || undefined },
    orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      groupId: true,
      platform: true,
      days: true,
      status: true,
      stage: true,
      recordsFetched: true,
      recordsSaved: true,
      attempts: true,
      error: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ jobs });
}
