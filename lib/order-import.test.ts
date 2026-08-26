import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrderCreate, buildOrderUpdate, prepareOrderRows } from './order-import';

test('maps the legacy A-P order worksheet by header name', () => {
  const prepared = prepareOrderRows([
    ['Mã Đơn', 'Tên Khách', 'SĐT', 'Sản Phẩm', 'Loại Vải', 'Tên Thợ', 'Ngày Đặt', 'Ngày Giao DK', 'Ngày Giao TT', 'Giá (VNĐ)', 'Trạng Thái', 'Có Media?', 'Có Feedback?', 'Link Media', 'Ghi Chú', 'Hành Động'],
    ['DH001', 'Nguyễn Lan', '0901234567', 'Váy Midi', 'Linen', 'Thợ A', '2026-08-01', '2026-08-10', '', '900,000', 'Đang may', 'Yes', 'No', 'https://example.com', 'Ưu tiên', 'Gọi khách'],
  ], 2);

  assert.equal(prepared.invalidRows.length, 0);
  assert.deepEqual(buildOrderCreate(prepared.rows[0]), {
    orderId: 'DH001',
    customerName: 'Nguyễn Lan',
    product: 'Váy Midi',
    quantity: 1,
    total: 900_000,
    deposit: 0,
    status: 'Đang may',
    hasMedia: 'Yes',
    hasFeedback: 'No',
    source: 'Google Sheet',
    phone: '0901234567',
    fabricType: 'Linen',
    tailorName: 'Thợ A',
    orderDate: '2026-08-01',
    expectedDate: '2026-08-10',
    price: '900,000',
    mediaLink: 'https://example.com',
    notes: 'Ưu tiên',
    action: 'Gọi khách',
  });
});

test('maps the Orders export layout and ignores the calculated remaining column', () => {
  const prepared = prepareOrderRows([
    ['Mã đơn hàng', 'Tên khách hàng', 'Số điện thoại', 'Sản phẩm', 'Loại sản phẩm', 'Số lượng', 'Tổng giá trị', 'Tiền cọc', 'Còn lại', 'Ngày nhận đơn', 'Ngày hẹn thử', 'Ngày giao hàng', 'Trạng thái', 'Bộ phận phụ trách', 'Ghi chú'],
    ['DH002', 'Khách B', '0912345678', 'Áo dài', 'Áo dài', '2', '2.000.000', '500.000', '1.500.000', '2026-08-01', '2026-08-05', '2026-08-10', 'Mới nhận', 'May', 'Gấp'],
  ], 2);

  assert.deepEqual(buildOrderUpdate(prepared.rows[0]), {
    customerName: 'Khách B',
    phone: '0912345678',
    product: 'Áo dài',
    productType: 'Áo dài',
    quantity: 2,
    total: 2_000_000,
    price: '2.000.000',
    deposit: 500_000,
    orderDate: '2026-08-01',
    tryDate: '2026-08-05',
    deliveryDate: '2026-08-10',
    status: 'Mới nhận',
    department: 'May',
    notes: 'Gấp',
  });
});

test('merges repeated order IDs without clearing omitted cells', () => {
  const prepared = prepareOrderRows([
    ['Mã đơn', 'Tên khách', 'Sản phẩm', 'Ghi chú', 'Trạng thái'],
    ['DH003', 'Khách C', 'Vest', 'Ghi chú cũ', 'Đang may'],
    ['DH003', 'Khách C mới', 'Vest mới', '', 'Đã giao'],
  ], 2);

  assert.equal(prepared.repeatedInSheet, 1);
  assert.equal(prepared.rows[0].data.notes, 'Ghi chú cũ');
  assert.equal(prepared.rows[0].data.status, 'Đã giao');
  assert.equal(prepared.rows[0].customerName, 'Khách C mới');
});

test('rejects invalid quantities, deposits, and missing required headers', () => {
  const prepared = prepareOrderRows([
    ['Mã đơn', 'Tên khách', 'Sản phẩm', 'Số lượng', 'Tổng giá trị', 'Tiền cọc'],
    ['DH004', 'Khách D', 'Đầm', '0', '1000000', '0'],
    ['DH005', 'Khách E', 'Đầm', '1', '1000000', '1500000'],
  ], 2);
  assert.deepEqual(prepared.invalidRows.map(row => row.reason), [
    'Số lượng không hợp lệ',
    'Tiền cọc không được lớn hơn tổng giá trị',
  ]);
  assert.throws(() => prepareOrderRows([['Mã đơn'], ['DH006']], 2), /Thiếu cột bắt buộc/);
});
