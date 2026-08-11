import type { Config } from '@netlify/functions';
import { asyncWorkloadFn, type AsyncWorkloadConfig, type AsyncWorkloadEvent } from '@netlify/async-workloads';
import { prisma } from '../../lib/prisma';
import {
  getTokenForPlatform,
  syncFacebookAds,
  syncFacebookPage,
  syncInstagram,
  type SyncLog,
} from '../../lib/sync-meta-utils';
import { META_SYNC_EVENT, type MetaSyncEvent } from '../../lib/netlify-async-workloads';

const MAX_RETRIES = 3;

export const config: Config = { background: true };
export const asyncWorkloadConfig: AsyncWorkloadConfig<MetaSyncEvent> = {
  name: 'Meta marketing data sync',
  events: [META_SYNC_EVENT],
  maxRetries: MAX_RETRIES,
  backoffSchedule: attempt => Math.min(60_000, 2 ** attempt * 5_000),
};

async function runPlatformSync(platform: string, days: string): Promise<SyncLog> {
  const credentials = await getTokenForPlatform(platform);
  if (!credentials.token) throw new Error(`Chua ket noi hoac token ${platform} khong hop le.`);

  if (platform === 'Facebook Page') return syncFacebookPage(credentials.token, credentials.pageId, days);
  if (platform === 'Facebook Ads') return syncFacebookAds(credentials.token, credentials.adAccountId, days);
  if (platform === 'Instagram') return syncInstagram(credentials.token, credentials.igAccountId, days);
  throw new Error(`Platform khong duoc ho tro: ${platform}`);
}

async function processJob(
  job: { id: string; groupId: string; platform: string; days: string },
  attempt: number,
): Promise<void> {
  await prisma.syncJob.update({
    where: { id: job.id },
    data: {
      status: 'RUNNING', stage: 'SYNCING', attempts: { increment: 1 },
      startedAt: new Date(), completedAt: null, error: null,
    },
  });

  try {
    const log = await runPlatformSync(job.platform, job.days);
    if (log.error) throw new Error(log.error);

    await prisma.$transaction([
      prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'SUCCESS', stage: 'COMPLETE', recordsFetched: log.recordsFetched,
          recordsSaved: log.recordsSaved, completedAt: new Date(), error: null,
        },
      }),
      prisma.automationLog.create({
        data: {
          level: 'success', source: `netlify-async-workload/${job.platform}`,
          message: `Dong bo ${job.platform} thanh cong`,
          details: JSON.stringify({ ...log, groupId: job.groupId, jobId: job.id }),
        },
      }),
    ]);
  } catch (error: any) {
    const isFinalAttempt = attempt >= MAX_RETRIES;
    const message = error?.message || `Dong bo ${job.platform} that bai.`;
    await prisma.$transaction([
      prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: isFinalAttempt ? 'FAILED' : 'RUNNING',
          stage: isFinalAttempt ? 'FAILED' : 'RETRYING', error: message,
          completedAt: isFinalAttempt ? new Date() : null,
        },
      }),
      prisma.automationLog.create({
        data: {
          level: isFinalAttempt ? 'error' : 'warning',
          source: `netlify-async-workload/${job.platform}`,
          message: isFinalAttempt
            ? `Dong bo ${job.platform} that bai sau ${MAX_RETRIES + 1} lan chay`
            : `Dong bo ${job.platform} that bai; Netlify se thu lai`,
          details: JSON.stringify({ groupId: job.groupId, jobId: job.id, attempt, error: message }),
        },
      }),
    ]);
    if (!isFinalAttempt) throw error;
  }
}

export default asyncWorkloadFn<MetaSyncEvent>(async (event: AsyncWorkloadEvent<MetaSyncEvent>) => {
  const job = await event.step.run('load-sync-job', async () => {
    const row = await prisma.syncJob.findUnique({
      where: { id: event.eventData.jobId },
      select: { id: true, groupId: true, platform: true, days: true },
    });
    if (!row) throw new Error(`Khong tim thay sync job ${event.eventData.jobId}.`);
    return row;
  });

  await event.step.run(`sync-${job.id}`, () => processJob(job, event.attempt));
});
