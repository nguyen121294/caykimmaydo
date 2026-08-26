import assert from 'node:assert/strict';
import test from 'node:test';

import { excelSerialToIso, prepareCutOrderRows } from './cut-order-import';

function row(values: Record<number, unknown>): unknown[] {
  const result: unknown[] = Array.from({ length: 31 }, () => '');
  Object.entries(values).forEach(([index, value]) => { result[Number(index)] = value; });
  return result;
}

test('converts Excel serial dates and treats zero as missing', () => {
  assert.equal(excelSerialToIso(46174), '2026-06-01');
  assert.equal(excelSerialToIso('46183'), '2026-06-10');
  assert.equal(excelSerialToIso(0), null);
  assert.equal(excelSerialToIso(''), null);
});

test('pairs AD-AE sequentially with real orders and maps the agreed columns', () => {
  const rows = [
    row({ 0: 'STT', 3: 'Họ và tên', 29: 'Ngày đặt chuẩn', 30: 'Ngày giao chuẩn' }),
    row({ 0: 1, 3: 'Khách Một', 4: '', 5: 'Quận 1', 7: 5_000_000, 8: 500_000, 9: 4_500_000, 10: 'done', 11: 2_000_000, 16: 'Lụa', 18: 'Chuyển khoản', 19: 'VCB', 20: 'Cô Lan', 21: 900_000, 22: 1_200_000, 23: 40_000, 26: 'Gấp', 29: 46174, 30: 46183 }),
    row({ 0: 'TOTAL', 3: 'TỔNG THÁNG 6', 29: 46184, 30: 46190 }),
    row({ 0: 1, 3: 'Khách Hai', 4: '0912 345 678', 7: 3_000_000, 9: 3_000_000, 10: 'Đang may', 22: 700_000 }),
  ];

  const prepared = prepareCutOrderRows(rows, 'batch-260826');

  assert.equal(prepared.length, 2);
  assert.deepEqual(prepared[0], {
    orderId: 'CAY-2026-06-001',
    customerName: 'Khách Một',
    phone: '1111111111',
    customerId: null,
    needsCustomerPhone: true,
    product: 'Sản phẩm may đo',
    productType: null,
    quantity: 1,
    fabricType: 'Lụa',
    tailorName: 'Cô Lan',
    orderDate: '2026-06-01',
    expectedDate: '2026-06-10',
    deliveryDate: '2026-06-10',
    deliveryAddress: 'Quận 1',
    listPrice: 5_000_000,
    discountAmount: 500_000,
    total: 4_500_000,
    deposit: 2_000_000,
    paymentMethod: 'Chuyển khoản',
    paymentAccount: 'VCB',
    tailorCost: 900_000,
    fabricCost: 1_200_000,
    shippingFee: 40_000,
    status: 'Đã giao',
    notes: 'Gấp',
    source: 'Excel báo cáo thu chi 2026',
    importBatchId: 'batch-260826',
  });
  assert.equal(prepared[1].orderDate, '2026-06-11');
  assert.equal(prepared[1].expectedDate, '2026-06-17');
  assert.equal(prepared[1].orderId, 'CAY-2026-06-002');
  assert.equal(prepared[1].phone, '0912345678');
  assert.equal(prepared[1].needsCustomerPhone, false);
  assert.equal(prepared[1].fabricCost, 700_000);
});

test('preserves the sequential slot when an AD-AE pair is zero', () => {
  const rows = [
    row({ 0: 'STT' }),
    row({ 0: 1, 3: 'Không ngày', 29: 0, 30: 0 }),
  ];

  const [order] = prepareCutOrderRows(rows, 'batch-zero');
  assert.equal(order.orderDate, null);
  assert.equal(order.expectedDate, null);
  assert.equal(order.deliveryDate, null);
  assert.equal(order.orderId, 'CAY-2026-00-001');
});
