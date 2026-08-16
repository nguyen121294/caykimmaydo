# CRM Google Sheet Import

## Goal
Import customer profiles from a public Google Sheet with duplicate preview and idempotent phone-based updates.

## Tasks
- [x] Audit the existing CRM, import APIs, and Customer schema.
- [x] Add a nullable normalized phone key and safe unique index migration.
- [x] Replace the service-account import with public CSV preview/confirm behavior.
- [x] Add Google Sheet link controls and duplicate preview to `/crm`.
- [x] Validate Prisma, lint, types, build, and the import flow.

## Done When
- [x] Re-importing the same sheet does not create duplicate customers or change loyalty/order totals.
- [x] Users see new, duplicate, skipped, and invalid counts before confirmation.
- [x] Public Viewer links work without Google credentials.

## Notes
- Customer identity is normalized Vietnamese phone number first; rows without a usable phone are rejected.
- Existing non-empty profile fields are only replaced by non-empty Sheet values.
