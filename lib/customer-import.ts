import { normalizeVietnamesePhone } from '@/lib/customer-phone';

export const CUSTOMER_STATUSES = ['Mới', 'Đang tư vấn', 'Đã mua', 'VIP', 'Không phản hồi'] as const;
export const CUSTOMER_TIERS = ['New', 'Silver', 'Gold', 'VIP'] as const;
export const MAX_CUSTOMER_IMPORT_ROWS = 5000;

type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
type CustomerTier = (typeof CUSTOMER_TIERS)[number];

export interface CustomerImportRow {
  rowNumber: number;
  stt: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  contactAccount: string;
  address: string;
  source: string;
  tags: string;
  notes: string;
  loyaltyTier: CustomerTier | null;
  totalSpent: number | null;
  lastPurchaseDate: string;
  status: CustomerStatus | null;
}

export interface PreparedCustomerRows {
  rows: CustomerImportRow[];
  invalidRows: Array<{ rowNumber: number; reason: string }>;
  skippedEmpty: number;
  repeatedInSheet: number;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function parseMoney(value: unknown): { value: number | null; error?: string } {
  const raw = cell(value);
  if (!raw) return { value: null };
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0
      ? { value: Math.round(value) }
      : { value: null, error: 'Tổng tiền đã chi tiêu không hợp lệ' };
  }

  const digits = raw.replace(/[.,\s]/g, '').replace(/[^\d-]/g, '');
  if (!digits || digits === '-') {
    return { value: null, error: 'Tổng tiền đã chi tiêu không hợp lệ' };
  }
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed >= 0
    ? { value: Math.round(parsed) }
    : { value: null, error: 'Tổng tiền đã chi tiêu không hợp lệ' };
}

function mergeNonEmpty(previous: CustomerImportRow, current: CustomerImportRow): CustomerImportRow {
  return {
    ...previous,
    ...Object.fromEntries(
      Object.entries(current).filter(([, value]) => value !== '' && value !== null),
    ),
    rowNumber: current.rowNumber,
    normalizedPhone: current.normalizedPhone,
  } as CustomerImportRow;
}

export function prepareCustomerRows(
  sourceRows: unknown[][],
  startRow: number,
): PreparedCustomerRows {
  const uniqueRows = new Map<string, CustomerImportRow>();
  const invalidRows: PreparedCustomerRows['invalidRows'] = [];
  let skippedEmpty = 0;
  let repeatedInSheet = 0;

  sourceRows.slice(startRow - 1, startRow - 1 + MAX_CUSTOMER_IMPORT_ROWS).forEach((row, index) => {
    const rowNumber = startRow + index;
    const values = row.map(cell);
    const name = values[1] || '';
    const rawPhone = values[2] || '';

    if (!name && !rawPhone) {
      skippedEmpty++;
      return;
    }

    const normalizedPhone = normalizeVietnamesePhone(rawPhone);
    if (!normalizedPhone) {
      invalidRows.push({ rowNumber, reason: 'Thiếu hoặc sai định dạng SĐT Việt Nam' });
      return;
    }
    if (!name) {
      invalidRows.push({ rowNumber, reason: 'Thiếu tên khách hàng' });
      return;
    }

    const tier = values[9] || '';
    if (tier && !CUSTOMER_TIERS.includes(tier as CustomerTier)) {
      invalidRows.push({ rowNumber, reason: `Hạng thành viên không hợp lệ: ${tier}` });
      return;
    }

    const status = values[12] || '';
    if (status && !CUSTOMER_STATUSES.includes(status as CustomerStatus)) {
      invalidRows.push({ rowNumber, reason: `Trạng thái không hợp lệ: ${status}` });
      return;
    }

    const money = parseMoney(row[10]);
    if (money.error) {
      invalidRows.push({ rowNumber, reason: money.error });
      return;
    }

    const customer: CustomerImportRow = {
      rowNumber,
      stt: values[0] || '',
      name,
      phone: rawPhone,
      normalizedPhone,
      email: values[3] || '',
      contactAccount: values[4] || '',
      address: values[5] || '',
      source: values[6] || '',
      tags: values[7] || '',
      notes: values[8] || '',
      loyaltyTier: tier ? tier as CustomerTier : null,
      totalSpent: money.value,
      lastPurchaseDate: values[11] || '',
      status: status ? status as CustomerStatus : null,
    };

    const previous = uniqueRows.get(normalizedPhone);
    if (previous) repeatedInSheet++;
    uniqueRows.set(normalizedPhone, previous ? mergeNonEmpty(previous, customer) : customer);
  });

  return { rows: [...uniqueRows.values()], invalidRows, skippedEmpty, repeatedInSheet };
}

export function buildCustomerUpdate(row: CustomerImportRow) {
  return {
    name: row.name,
    phone: row.normalizedPhone,
    normalizedPhone: row.normalizedPhone,
    ...(row.email && { email: row.email }),
    ...(row.contactAccount && { contactAccount: row.contactAccount }),
    ...(row.address && { address: row.address }),
    ...(row.source && { source: row.source }),
    ...(row.tags && { tags: row.tags }),
    ...(row.notes && { notes: row.notes }),
    ...(row.loyaltyTier && { loyaltyTier: row.loyaltyTier }),
    ...(row.totalSpent !== null && { totalSpent: row.totalSpent }),
    ...(row.lastPurchaseDate && { lastPurchaseDate: row.lastPurchaseDate }),
  };
}

export function buildCustomerCreate(row: CustomerImportRow, fallbackSource: string) {
  return {
    ...buildCustomerUpdate(row),
    source: row.source || fallbackSource,
    status: row.status || 'Mới',
    loyaltyTier: row.loyaltyTier || 'New',
    totalSpent: row.totalSpent ?? 0,
  };
}
