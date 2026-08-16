import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCustomerCreate,
  buildCustomerUpdate,
  prepareCustomerRows,
} from './customer-import';

test('maps the A-M customer profile format and normalizes snapshot values', () => {
  const prepared = prepareCustomerRows([
    ['STT', 'Tên khách hàng', 'SĐT'],
    ['1', 'Nguyễn Văn An', '+84 912 345 678', 'an@example.com', 'an.zalo', 'Hà Nội', 'Giới thiệu', 'VIP', 'Khách thích màu xanh', 'Gold', '25.500.000', '2026-08-01', 'Đã mua'],
  ], 2);

  assert.equal(prepared.invalidRows.length, 0);
  assert.equal(prepared.rows.length, 1);
  assert.deepEqual(prepared.rows[0], {
    rowNumber: 2,
    stt: '1',
    name: 'Nguyễn Văn An',
    phone: '+84 912 345 678',
    normalizedPhone: '0912345678',
    email: 'an@example.com',
    contactAccount: 'an.zalo',
    address: 'Hà Nội',
    source: 'Giới thiệu',
    tags: 'VIP',
    notes: 'Khách thích màu xanh',
    loyaltyTier: 'Gold',
    totalSpent: 25_500_000,
    lastPurchaseDate: '2026-08-01',
    status: 'Đã mua',
  });
});

test('merges repeated phones and keeps the last non-empty value', () => {
  const prepared = prepareCustomerRows([
    ['1', 'Khách A', '0912345678', 'first@example.com'],
    ['2', 'Khách A mới', '+84912345678', '', 'zalo-a'],
  ], 1);

  assert.equal(prepared.repeatedInSheet, 1);
  assert.equal(prepared.rows.length, 1);
  assert.equal(prepared.rows[0].name, 'Khách A mới');
  assert.equal(prepared.rows[0].email, 'first@example.com');
  assert.equal(prepared.rows[0].contactAccount, 'zalo-a');
});

test('rejects invalid required values and controlled enums', () => {
  const prepared = prepareCustomerRows([
    ['1', 'Thiếu số', ''],
    ['2', 'Sai hạng', '0912345678', '', '', '', '', '', '', 'Platinum'],
    ['3', 'Sai trạng thái', '0987654321', '', '', '', '', '', '', 'New', '0', '', 'Không rõ'],
    ['4', 'Sai tổng tiền', '0901234567', '', '', '', '', '', '', 'New', 'không rõ'],
  ], 1);

  assert.equal(prepared.rows.length, 0);
  assert.deepEqual(prepared.invalidRows.map(row => row.reason), [
    'Thiếu hoặc sai định dạng SĐT Việt Nam',
    'Hạng thành viên không hợp lệ: Platinum',
    'Trạng thái không hợp lệ: Không rõ',
    'Tổng tiền đã chi tiêu không hợp lệ',
  ]);
});

test('existing customer updates do not overwrite status or increment totals', () => {
  const [row] = prepareCustomerRows([
    ['1', 'Khách A', '0912345678', '', '', '', '', '', '', 'VIP', '1000000', '2026-08-01', 'Đã mua'],
  ], 1).rows;

  const update = buildCustomerUpdate(row);
  const create = buildCustomerCreate(row, 'Import File');

  assert.equal('status' in update, false);
  assert.equal(update.totalSpent, 1_000_000);
  assert.equal(create.status, 'Đã mua');
  assert.equal(create.totalSpent, 1_000_000);
});
