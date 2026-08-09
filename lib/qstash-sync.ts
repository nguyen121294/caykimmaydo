import { Client } from '@upstash/qstash';

export interface SyncJobMessage {
  jobId: string;
  revision: number;
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.URL;
  if (!baseUrl) {
    throw new Error('Thiếu NEXT_PUBLIC_APP_URL hoặc NEXTAUTH_URL để QStash gọi worker.');
  }
  return baseUrl.replace(/\/+$/, '');
}

function getClient(): Client {
  if (!process.env.QSTASH_TOKEN) {
    throw new Error('Thiếu QSTASH_TOKEN trong biến môi trường.');
  }
  return new Client({ token: process.env.QSTASH_TOKEN });
}

export function assertQStashConfiguration(): void {
  getBaseUrl();
  getClient();
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
    throw new Error('Thiếu QSTASH_CURRENT_SIGNING_KEY hoặc QSTASH_NEXT_SIGNING_KEY.');
  }
}

export async function publishSyncJob(message: SyncJobMessage): Promise<string> {
  const response = await getClient().publishJSON({
    url: `${getBaseUrl()}/api/marketing/sync/meta/worker`,
    body: message,
    retries: 3,
    retryDelay: 'max(1000, pow(2, retried) * 1000)',
    timeout: '50s',
    deduplicationId: `meta-sync-${message.jobId}-${message.revision}`,
    label: ['meta-sync', message.jobId],
  });
  return response.messageId;
}
