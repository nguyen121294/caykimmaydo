# QStash Sync Jobs

## Goal
Move all Meta sync actions to a sequential, resumable QStash pipeline that returns immediately and keeps each Netlify invocation bounded.

## Tasks
- [x] Add `SyncJob` persistence and migration → Verify Prisma client accepts queued/running job records.
- [x] Add QStash publishing and signed worker helpers → Verify missing configuration returns actionable JSON.
- [x] Convert the Meta route into a `202` dispatcher → Verify it no longer calls Meta synchronously.
- [x] Refactor Meta sync into resumable batches → Verify each continuation persists cursor/stage and is idempotent.
- [x] Make “sync all” a sequential three-platform chain → Verify the next platform starts only after the previous succeeds.
- [x] Add job status API and Hub polling/error-safe JSON parsing → Verify queued/running/success/failed states render correctly.
- [x] Run Prisma generation, type checking, lint, and production build → Verify all checks pass.

## Done When
- [x] Sync Hub never waits for a long Meta request, QStash workers can continue across batches, and failures remain visible as JSON/job status.

## Notes
- QStash retries require idempotent batch processing.
- Target each worker invocation to finish before Netlify's request limit; continuation is published before more work is attempted.
