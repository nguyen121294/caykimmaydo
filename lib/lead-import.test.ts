import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLeadData, prepareLeadRows } from './lead-import';

test('maps the A-K sales lead format', () => {
  const prepared = prepareLeadRows([
    ['STT', 'Tên lead', 'SĐT'],
    ['1', 'Nguyễn Văn An', '+84 912 345 678', 'an@example.com', 'Facebook', 'Đang tư vấn', '2.500.000', 'Lan', 'Gửi báo giá', '2026-08-20', 'Ưu tiên'],
  ], 2);

  assert.equal(prepared.invalidRows.length, 0);
  assert.deepEqual(prepared.rows[0], {
    rowNumber: 2,
    name: 'Nguyễn Văn An',
    phone: '0912345678',
    normalizedPhone: '0912345678',
    email: 'an@example.com',
    source: 'Facebook',
    stage: 'Đang tư vấn',
    value: 2_500_000,
    assignee: 'Lan',
    nextAction: 'Gửi báo giá',
    nextDate: '2026-08-20',
    notes: 'Ưu tiên',
  });
});

test('merges repeated phone numbers using the last non-empty values', () => {
  const prepared = prepareLeadRows([
    ['1', 'Lead A', '0912345678', 'first@example.com', 'Facebook', 'Mới', '1000000'],
    ['2', 'Lead A mới', '+84912345678', '', 'Zalo', 'Báo giá', '', 'Lan'],
  ], 1);

  assert.equal(prepared.repeatedInSheet, 1);
  assert.equal(prepared.rows.length, 1);
  assert.equal(prepared.rows[0].name, 'Lead A mới');
  assert.equal(prepared.rows[0].email, 'first@example.com');
  assert.equal(prepared.rows[0].stage, 'Báo giá');
  assert.equal(prepared.rows[0].value, 1_000_000);
  assert.equal(prepared.rows[0].assignee, 'Lan');
});

test('rejects invalid phone, stage, and value fields', () => {
  const prepared = prepareLeadRows([
    ['1', 'Sai số', '123'],
    ['2', 'Sai giai đoạn', '0912345678', '', '', 'Đã mua'],
    ['3', 'Sai giá trị', '0987654321', '', '', 'Mới', '-500'],
  ], 1);

  assert.deepEqual(prepared.invalidRows.map(row => row.reason), [
    'Thiếu hoặc sai định dạng SĐT Việt Nam',
    'Giai đoạn không hợp lệ: Đã mua',
    'Giá trị cơ hội không hợp lệ',
  ]);
});

test('builds nullable optional Prisma fields', () => {
  const [row] = prepareLeadRows([['1', 'Lead A', '0912345678']], 1).rows;
  assert.deepEqual(buildLeadData(row), {
    name: 'Lead A',
    phone: '0912345678',
    email: null,
    source: 'Google Sheet',
    stage: 'Mới',
    value: 0,
    assignee: null,
    nextAction: null,
    nextDate: null,
    notes: null,
  });
});
