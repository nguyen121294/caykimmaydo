import { AsyncWorkloadsClient, type CustomAsyncWorkloadEvent } from '@netlify/async-workloads';

export const META_SYNC_EVENT = 'meta-sync.requested' as const;

export interface MetaSyncEvent extends CustomAsyncWorkloadEvent {
  eventName: typeof META_SYNC_EVENT;
  eventData: { jobId: string };
}

export async function publishMetaSync(jobId: string): Promise<string> {
  const client = new AsyncWorkloadsClient<MetaSyncEvent>();
  const result = await client.send(META_SYNC_EVENT, { data: { jobId } });

  if (result.sendStatus !== 'succeeded') {
    throw new Error('Netlify Async Workloads khong the xep hang tac vu dong bo.');
  }
  return result.eventId;
}
