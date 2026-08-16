import type { Config } from '@netlify/functions';
import { asyncWorkloadFn, type AsyncWorkloadConfig, type AsyncWorkloadEvent } from '@netlify/async-workloads';
import { prisma } from '../../lib/prisma';
import { syncSalesInboxToDatabase } from '../../lib/sales-inbox';
import {
  DAILY_INBOX_SYNC_EVENT,
  type DailyInboxSyncEvent,
} from '../../lib/netlify-async-workloads';

export const config: Config = { background: true };

export const asyncWorkloadConfig: AsyncWorkloadConfig<DailyInboxSyncEvent> = {
  name: 'Daily sales inbox sync',
  events: [DAILY_INBOX_SYNC_EVENT],
  maxRetries: 3,
  backoffSchedule: attempt => Math.min(60_000, 2 ** attempt * 5_000),
};

export default asyncWorkloadFn<DailyInboxSyncEvent>(async (event: AsyncWorkloadEvent<DailyInboxSyncEvent>) => {
  await event.step.run('sync-and-upsert-sales-inbox', async () => {
    const result = await syncSalesInboxToDatabase();
    await prisma.automationLog.create({
      data: {
        level: 'success',
        source: 'daily-sales-inbox-sync',
        message: `Dong bo inbox thanh cong: ${result.conversations.length} hoi thoai da luu`,
        details: JSON.stringify({
          triggeredAt: event.eventData.triggeredAt,
          fetchedAt: result.fetchedAt,
          platforms: result.platforms,
        }),
      },
    });
  });
});
