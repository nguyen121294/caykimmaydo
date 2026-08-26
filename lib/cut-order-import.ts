import { normalizeVietnamesePhone } from './customer-phone';

export const MISSING_ORDER_PHONE = '1111111111';

export interface CutOrderImportRow {
  orderId: string;
  customerName: string;
  phone: string;
  customerId: null;
  needsCustomerPhone: boolean;
  product: string;
  productType: string | null;
  quantity: number;
  fabricType: string | null;
  tailorName: string | null;
  orderDate: string | null;
  expectedDate: string | null;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  listPrice: number;
  discountAmount: number;
  total: number;
  deposit: number;
  paymentMethod: string | null;
  paymentAccount: string | null;
  tailorCost: number;
  fabricCost: number;
  shippingFee: number;
  status: string;
  notes: string | null;
  source: string;
  importBatchId: string;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function money(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0;
  const raw = text(value);
  if (!raw) return 0;
  const parsed = Number(raw.replace(/[.,\s]/g, '').replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function excelSerialToIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const timestamp = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeStatus(value: unknown): string {
  const raw = text(value);
  const normalized = raw.toLocaleLowerCase('vi');
  if (!raw) return 'Mới nhận';
  if (['done', 'đã xong', 'hoàn tất', 'đã giao'].includes(normalized)) return 'Đã giao';
  if (normalized.includes('hủy')) return 'Hủy';
  return raw;
}

function isRealOrder(row: unknown[]): boolean {
  const sequence = Number(row?.[0]);
  return Number.isInteger(sequence) && sequence > 0 && Boolean(text(row?.[3]));
}

export function prepareCutOrderRows(sourceRows: unknown[][], importBatchId: string): CutOrderImportRow[] {
  if (!importBatchId.trim()) throw new Error('Thiếu mã đợt import.');

  // AD-AE are an independent, authoritative 30-row date list. Their physical rows
  // intentionally do not need to match the order rows in columns A-AA.
  const datePairs = sourceRows.slice(1).map(row => ({
    orderDate: excelSerialToIso(row?.[29]),
    expectedDate: excelSerialToIso(row?.[30]),
  }));
  const orderRows = sourceRows.slice(1).filter(isRealOrder);
  if (datePairs.length < orderRows.length) {
    throw new Error(`Danh sách AD-AE chỉ có ${datePairs.length} vị trí cho ${orderRows.length} đơn.`);
  }

  const sequenceByMonth = new Map<string, number>();
  let currentMonth = '2026-00';
  return orderRows.map((row, index) => {
    const dates = datePairs[index] ?? { orderDate: null, expectedDate: null };
    if (dates.orderDate) currentMonth = dates.orderDate.slice(0, 7);
    const month = currentMonth;
    const monthSequence = (sequenceByMonth.get(month) ?? 0) + 1;
    sequenceByMonth.set(month, monthSequence);
    const normalizedPhone = normalizeVietnamesePhone(row?.[4]);
    const needsCustomerPhone = !normalizedPhone;

    return {
      orderId: `CAY-${month}-${String(monthSequence).padStart(3, '0')}`,
      customerName: text(row?.[3]),
      phone: normalizedPhone ?? MISSING_ORDER_PHONE,
      customerId: null,
      needsCustomerPhone,
      product: 'Sản phẩm may đo',
      productType: null,
      quantity: 1,
      fabricType: text(row?.[16]) || null,
      tailorName: text(row?.[20]) || null,
      orderDate: dates.orderDate,
      expectedDate: dates.expectedDate,
      deliveryDate: dates.expectedDate,
      deliveryAddress: text(row?.[5]) || null,
      listPrice: money(row?.[7]),
      discountAmount: money(row?.[8]),
      total: money(row?.[9]),
      deposit: money(row?.[11]),
      paymentMethod: text(row?.[18]) || null,
      paymentAccount: text(row?.[19]) || null,
      tailorCost: money(row?.[21]),
      fabricCost: money(row?.[22]),
      shippingFee: money(row?.[23]),
      status: normalizeStatus(row?.[10]),
      notes: text(row?.[26]) || null,
      source: 'Excel báo cáo thu chi 2026',
      importBatchId,
    };
  });
}
