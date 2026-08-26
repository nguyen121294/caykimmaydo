export const MAX_ORDER_IMPORT_ROWS = 5000;

type OrderImportData = {
  customerName?: string;
  phone?: string;
  product?: string;
  productType?: string;
  quantity?: number;
  fabricType?: string;
  tailorName?: string;
  orderDate?: string;
  expectedDate?: string;
  actualDate?: string;
  tryDate?: string;
  deliveryDate?: string;
  price?: string;
  total?: number;
  deposit?: number;
  department?: string;
  status?: string;
  hasMedia?: string;
  hasFeedback?: string;
  mediaLink?: string;
  notes?: string;
  action?: string;
  source?: string;
};

export interface OrderImportRow {
  rowNumber: number;
  orderId: string;
  customerName: string;
  product: string;
  data: OrderImportData;
}

export interface PreparedOrderRows {
  rows: OrderImportRow[];
  invalidRows: Array<{ rowNumber: number; reason: string }>;
  skippedEmpty: number;
  repeatedInSheet: number;
}

const HEADER_FIELDS: Record<string, keyof OrderImportData | 'orderId' | 'remaining'> = {
  'ma don': 'orderId',
  'ma don hang': 'orderId',
  'ten khach': 'customerName',
  'ten khach hang': 'customerName',
  'sdt': 'phone',
  'so dien thoai': 'phone',
  'san pham': 'product',
  'loai san pham': 'productType',
  'sl': 'quantity',
  'so luong': 'quantity',
  'loai vai': 'fabricType',
  'ten tho': 'tailorName',
  'tho may': 'tailorName',
  'ngay dat': 'orderDate',
  'ngay nhan don': 'orderDate',
  'ngay giao dk': 'expectedDate',
  'ngay giao du kien': 'expectedDate',
  'ngay giao tt': 'actualDate',
  'ngay giao thuc te': 'actualDate',
  'ngay hen thu': 'tryDate',
  'ngay thu': 'tryDate',
  'ngay giao hang': 'deliveryDate',
  'gia': 'price',
  'gia vnd': 'price',
  'tong gia tri': 'total',
  'tong': 'total',
  'tien coc': 'deposit',
  'coc': 'deposit',
  'con lai': 'remaining',
  'trang thai': 'status',
  'bo phan': 'department',
  'bo phan phu trach': 'department',
  'co media': 'hasMedia',
  'co hinh anh': 'hasMedia',
  'co feedback': 'hasFeedback',
  'link media': 'mediaLink',
  'ghi chu': 'notes',
  'hanh dong': 'action',
  'nguon': 'source',
};

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return cell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseMoney(value: string): number | null {
  if (!value) return 0;
  const digits = value.replace(/[.,\s]/g, '').replace(/[^\d-]/g, '');
  if (!digits || digits === '-') return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function parseQuantity(value: string): number | null {
  if (!value) return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseYesNo(value: string): string | null {
  if (!value) return 'No';
  const normalized = normalizeHeader(value);
  if (['yes', 'co', 'da co'].includes(normalized)) return 'Yes';
  if (['no', 'khong', 'chua'].includes(normalized)) return 'No';
  return null;
}

function getHeaderMap(headerRow: unknown[]): Map<number, keyof OrderImportData | 'orderId' | 'remaining'> {
  const fields = new Map<number, keyof OrderImportData | 'orderId' | 'remaining'>();
  headerRow.forEach((header, index) => {
    const field = HEADER_FIELDS[normalizeHeader(header)];
    if (field) fields.set(index, field);
  });
  return fields;
}

function parseOrderData(values: string[], headers: Map<number, keyof OrderImportData | 'orderId' | 'remaining'>) {
  const data: OrderImportData = {};
  let orderId = '';
  let error = '';

  headers.forEach((field, index) => {
    const value = values[index] || '';
    if (field === 'remaining' || !value) return;
    if (field === 'orderId') { orderId = value; return; }
    if (field === 'quantity') {
      const quantity = parseQuantity(value);
      if (quantity === null) error = 'Số lượng không hợp lệ'; else data.quantity = quantity;
      return;
    }
    if (field === 'total' || field === 'deposit' || field === 'price') {
      const money = parseMoney(value);
      if (money === null) { error = `${field === 'deposit' ? 'Tiền cọc' : 'Giá trị đơn'} không hợp lệ`; return; }
      if (field === 'deposit') data.deposit = money;
      else { data.total = money; data.price = value; }
      return;
    }
    if (field === 'hasMedia' || field === 'hasFeedback') {
      const yesNo = parseYesNo(value);
      if (!yesNo) error = `${field === 'hasMedia' ? 'Có Media' : 'Có Feedback'} chỉ nhận Yes/No`;
      else data[field] = yesNo;
      return;
    }
    data[field] = value;
  });

  return { orderId, data, error };
}

export function prepareOrderRows(sourceRows: unknown[][], startRow: number): PreparedOrderRows {
  const headerRow = sourceRows[startRow - 2];
  if (!headerRow) throw new Error('Không tìm thấy hàng tiêu đề ngay phía trên hàng bắt đầu dữ liệu.');
  const headers = getHeaderMap(headerRow);
  const presentFields = new Set(headers.values());
  const missing = [
    !presentFields.has('orderId') && 'Mã đơn hàng',
    !presentFields.has('customerName') && 'Tên khách hàng',
    !presentFields.has('product') && 'Sản phẩm',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(', ')}.`);

  const uniqueRows = new Map<string, OrderImportRow>();
  const invalidRows: PreparedOrderRows['invalidRows'] = [];
  let skippedEmpty = 0;
  let repeatedInSheet = 0;

  sourceRows.slice(startRow - 1, startRow - 1 + MAX_ORDER_IMPORT_ROWS).forEach((row, index) => {
    const rowNumber = startRow + index;
    const values = row.map(cell);
    if (values.every(value => !value)) { skippedEmpty++; return; }
    const parsed = parseOrderData(values, headers);
    const customerName = parsed.data.customerName || '';
    const product = parsed.data.product || '';
    const reason = parsed.error
      || (!parsed.orderId ? 'Thiếu mã đơn hàng' : '')
      || (!customerName ? 'Thiếu tên khách hàng' : '')
      || (!product ? 'Thiếu sản phẩm' : '')
      || (parsed.data.total !== undefined && parsed.data.deposit !== undefined && parsed.data.deposit > parsed.data.total
        ? 'Tiền cọc không được lớn hơn tổng giá trị' : '');
    if (reason) { invalidRows.push({ rowNumber, reason }); return; }

    const current: OrderImportRow = { rowNumber, orderId: parsed.orderId, customerName, product, data: parsed.data };
    const previous = uniqueRows.get(parsed.orderId);
    if (previous) repeatedInSheet++;
    uniqueRows.set(parsed.orderId, previous ? {
      ...current,
      data: { ...previous.data, ...current.data },
    } : current);
  });

  return { rows: [...uniqueRows.values()], invalidRows, skippedEmpty, repeatedInSheet };
}

export function buildOrderUpdate(row: OrderImportRow): OrderImportData {
  return row.data;
}

export function buildOrderCreate(row: OrderImportRow) {
  return {
    orderId: row.orderId,
    customerName: row.customerName,
    product: row.product,
    quantity: 1,
    total: 0,
    deposit: 0,
    status: 'Mới nhận',
    hasMedia: 'No',
    hasFeedback: 'No',
    source: 'Google Sheet',
    ...row.data,
  };
}
