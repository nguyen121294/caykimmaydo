import type { Config } from '@netlify/functions';
import { publishDailyInboxSync } from '../../lib/netlify-async-workloads';

export default async function handler(_request: Request): Promise<Response> {
  const triggeredAt = new Date().toISOString();
  const eventId = await publishDailyInboxSync(triggeredAt);
  return Response.json({ queued: true, eventId, triggeredAt });
}

export const config: Config = {
  schedule: '0 0 * * *',
};
