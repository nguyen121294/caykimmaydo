# Netlify Async Workloads for Meta sync

The `stage_test` branch dispatches one `meta-sync.requested` event for each
`SyncJob`. Facebook Page, Facebook Ads, and Instagram therefore have independent
retries and status records.

## Netlify setup

1. In the Netlify team dashboard, install and enable the **Async Workloads**
   extension for this site.
2. If the site is on the Starter plan, add `AWL_API_KEY` to the site's environment
   variables. Netlify supplies runtime configuration automatically on plans where
   an explicit key is not required.
3. Deploy the `stage_test` branch and verify that Netlify discovers
   `netlify/functions/meta-sync-workload.ts`.

The workload is configured as a background function so each sync invocation may
run for up to 15 minutes. Netlify retries a failing platform up to three times
(four total attempts) with exponential backoff.

## Test

Open the branch deploy dashboard, choose a date range, and click **Lam moi**.
The existing `/api/marketing/sync/jobs` endpoint reports `QUEUED`, `RUNNING`,
`SUCCESS`, or `FAILED`. The Async Workloads event ID is stored in the existing
`SyncJob.messageId` field.

The sync functions retain the current incremental behavior: update matching
records, insert missing records, and do not delete existing data when the remote
response is incomplete or a job fails.

## Rollback

The previous QStash worker and helper remain in the branch for comparison and a
low-risk rollback. The new Meta dispatcher no longer invokes them.
