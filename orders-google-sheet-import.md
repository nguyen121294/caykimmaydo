# Orders Google Sheet Import

## Goal
Import and update Orders from a selected worksheet in the shared public Google Sheet workbook.

## Tasks
- [x] Parse order worksheets by Vietnamese header names and support both legacy and Orders-export layouts. Verify: required, numeric, date, status, and duplicate rules are tested.
- [x] Add an authenticated preview/import API that upserts by order ID. Verify: preview reports new, updated, invalid, repeated, and empty rows.
- [x] Add the Orders worksheet picker and preview/confirm modal. Verify: the selected tab is required and Orders refresh after import.
- [x] Run tests, scoped lint, type-check, production build, and local route verification.

## Done When
- [x] Orders can use the same Google Sheet link as CRM/Sales while selecting its own worksheet.
- [x] Re-importing a worksheet updates matching order IDs without creating duplicates.
- [x] Fields absent from a worksheet are preserved on existing orders.

## Notes
- The worksheet header must be immediately above the configured first data row.
- Google Sheet sharing remains “Anyone with the link – Viewer”.
