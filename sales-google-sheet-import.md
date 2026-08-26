# Sales Google Sheet Import

## Goal
Import Sales leads from a selected worksheet in the same public Google Sheet workbook used by CRM.

## Tasks
- [x] Add a shared public Google Sheet workbook reader and authenticated sheet-list endpoint. Verify: a valid link returns worksheet names and invalid/private links return clear errors.
- [x] Make CRM select a worksheet before preview/import. Verify: the selected worksheet is sent to the CRM API and shown in results.
- [x] Add lead row parsing, validation, duplicate handling, and tests. Verify: valid A-K rows map correctly and repeated/existing phone numbers update safely.
- [x] Add the Sales import preview/confirm modal and API. Verify: users choose a worksheet, preview counts, then import and refresh the Kanban.
- [x] Run tests, lint, type-check, build, and local browser checks.

## Done When
- [x] CRM and Sales can use one Google Sheet link while importing different selected worksheets.
- [x] Sales import previews new, duplicate, invalid, and empty rows before confirmation.
- [x] Re-importing a Sales worksheet does not create duplicate leads for the same normalized phone number.

## Notes
- Google Sheet sharing remains “Anyone with the link – Viewer”.
- Sales columns A-K: STT, lead name, phone, email, source, stage, value, assignee, next action, next date, notes.
