import assert from 'node:assert/strict';
import test from 'node:test';
import * as XLSX from 'xlsx';
import { extractGoogleSpreadsheetId, readWorksheetRows } from './google-sheet-workbook';

test('extracts only Google Sheets spreadsheet IDs', () => {
  assert.equal(
    extractGoogleSpreadsheetId('https://docs.google.com/spreadsheets/d/sheet_123-AbC/edit#gid=10'),
    'sheet_123-AbC',
  );
  assert.equal(extractGoogleSpreadsheetId('https://example.com/spreadsheets/d/sheet_123/edit'), null);
  assert.equal(extractGoogleSpreadsheetId('not-a-url'), null);
});

test('reads the explicitly selected worksheet by case-insensitive name', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['CRM']]), 'Khách hàng');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['SALES']]), 'Sales Pipeline');

  const selected = readWorksheetRows(workbook, 'sales pipeline');
  assert.equal(selected.sheetName, 'Sales Pipeline');
  assert.deepEqual(selected.rows, [['SALES']]);
});

test('requires a selected worksheet', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['CRM']]), 'CRM');
  assert.throws(() => readWorksheetRows(workbook, ''), /chọn Sheet\/Tab/);
});
