# Multichannel Sales Inbox

## Goal

Add a real-data unified message workspace below the `/sales` Kanban with a side-by-side quick order form.

## Tasks

- [x] Add a protected unified inbox API for connected Facebook, Instagram, Zalo, TikTok, ManyChat, and Telegram accounts. Verify: each platform returns conversations or an explicit connection/capability status without exposing credentials.
- [x] Normalize live provider payloads into one conversation and message shape. Verify: inbound/outbound direction, customer identity, timestamps, and platform labels are stable.
- [x] Build the responsive three-pane inbox under the sales board. Verify: filters, search, conversation selection, loading, empty, and partial-error states work.
- [x] Add a quick order form beside the selected conversation. Verify: customer and source are prefilled, validation blocks invalid deposits, and `/api/orders` receives the order.
- [x] Keep the existing Sales Pipeline behavior intact. Verify: lead loading, adding, and stage updates still compile against the unchanged API.
- [x] Validate and execute the feature. Verify: lint, type checking, tests, production build, and local runtime checks pass.

## Done When

- [x] Staff can open `/sales`, read real available conversations across every configured platform, and create an order without leaving the active conversation.
- [x] Unsupported or unconnected provider states are honest and actionable, with no sample messages.
- [x] Message history is stored incrementally with provider keys; daily sync updates changed rows, inserts missing rows, and never deletes old rows.

## Notes

- The first release reads real data from provider capabilities already connected to the project. Providers that do not expose message history through the configured API show a capability notice and remain ready for webhook ingestion later.
- Netlify queues the daily inbox sync at 00:00 UTC (07:00 Vietnam time) and runs the actual provider work as a retryable background workload.
- Sync actions stay in `/sync-hub` according to the project navigation convention.
