export const FINANCE_ROW_KINDS = ['GROUP', 'DETAIL', 'TOTAL_EXPENSES', 'REVENUE', 'PROFIT'] as const;
export type FinanceRowKind = (typeof FINANCE_ROW_KINDS)[number];

export type MonthValues = Record<string, number>;

export const DEFAULT_FINANCE_ROWS: Array<{
  label: string;
  kind: FinanceRowKind;
  parentLabel?: string;
}> = [
  { label: 'CHI PHÍ VẬN HÀNH', kind: 'GROUP' },
  { label: 'NHÂN VIÊN MKT', kind: 'DETAIL', parentLabel: 'CHI PHÍ VẬN HÀNH' },
  { label: 'NHÂN VIÊN SALE', kind: 'DETAIL', parentLabel: 'CHI PHÍ VẬN HÀNH' },
  { label: 'THUẾ', kind: 'DETAIL', parentLabel: 'CHI PHÍ VẬN HÀNH' },
  { label: 'CHẠY ADS', kind: 'DETAIL', parentLabel: 'CHI PHÍ VẬN HÀNH' },
  { label: 'COST SẢN PHẨM', kind: 'GROUP' },
  { label: 'BAO BÌ', kind: 'DETAIL', parentLabel: 'COST SẢN PHẨM' },
  { label: 'THỢ (CÔNG MAY)', kind: 'DETAIL', parentLabel: 'COST SẢN PHẨM' },
  { label: 'VẢI', kind: 'DETAIL', parentLabel: 'COST SẢN PHẨM' },
  { label: 'BIẾN PHÍ', kind: 'GROUP' },
  { label: 'BOOKING', kind: 'DETAIL', parentLabel: 'BIẾN PHÍ' },
  { label: 'FREE SAMPLES', kind: 'DETAIL', parentLabel: 'BIẾN PHÍ' },
  { label: 'CHI TRẢ TRƯỚC (HẠCH TOÁN SAU)', kind: 'DETAIL', parentLabel: 'BIẾN PHÍ' },
  { label: 'ƯU ĐÃI', kind: 'DETAIL', parentLabel: 'BIẾN PHÍ' },
  { label: 'BONUS KPI', kind: 'DETAIL', parentLabel: 'BIẾN PHÍ' },
  { label: 'HỖ TRỢ SHIP', kind: 'DETAIL', parentLabel: 'BIẾN PHÍ' },
  { label: 'BIẾN PHÍ KHÁC', kind: 'DETAIL', parentLabel: 'BIẾN PHÍ' },
  { label: 'TOTAL EXPENSES', kind: 'TOTAL_EXPENSES' },
  { label: 'DOANH THU', kind: 'REVENUE' },
  { label: 'LỢI NHUẬN', kind: 'PROFIT' },
];

export function emptyMonthValues(): MonthValues {
  return Object.fromEntries(Array.from({ length: 12 }, (_, index) => [String(index + 1), 0]));
}

export function normalizeMonthValues(input: unknown): MonthValues {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  return Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1);
      const value = Number(source[month]);
      return [month, Number.isFinite(value) ? value : 0];
    }),
  );
}

export function isFinanceRowKind(value: unknown): value is FinanceRowKind {
  return FINANCE_ROW_KINDS.includes(value as FinanceRowKind);
}
