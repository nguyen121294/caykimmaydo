import { normalizeVietnamesePhone } from '@/lib/customer-phone';

export const LEAD_STAGES = ['Mới', 'Đang tư vấn', 'Báo giá', 'Đặt cọc', 'Chốt đơn', 'Thua'] as const;
export const MAX_LEAD_IMPORT_ROWS = 5000;

type LeadStage = (typeof LEAD_STAGES)[number];

export interface LeadImportRow {
  rowNumber: number;
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  source: string;
  stage: LeadStage;
  value: number;
  assignee: string;
  nextAction: string;
  nextDate: string;
  notes: string;
}

export interface PreparedLeadRows {
  rows: LeadImportRow[];
  invalidRows: Array<{ rowNumber: number; reason: string }>;
  skippedEmpty: number;
  repeatedInSheet: number;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseValue(value: unknown): number | null {
  const raw = cell(value);
  if (!raw) return 0;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  const digits = raw.replace(/[.,\s]/g, '').replace(/[^\d-]/g, '');
  if (!digits || digits === '-') return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function mergeLeadRows(previous: LeadImportRow, current: LeadImportRow, rawValues: string[]): LeadImportRow {
  return {
    ...current,
    rowNumber: current.rowNumber,
    email: rawValues[3] ? current.email : previous.email,
    source: rawValues[4] ? current.source : previous.source,
    stage: rawValues[5] ? current.stage : previous.stage,
    value: rawValues[6] ? current.value : previous.value,
    assignee: rawValues[7] ? current.assignee : previous.assignee,
    nextAction: rawValues[8] ? current.nextAction : previous.nextAction,
    nextDate: rawValues[9] ? current.nextDate : previous.nextDate,
    notes: rawValues[10] ? current.notes : previous.notes,
  };
}

export function prepareLeadRows(sourceRows: unknown[][], startRow: number): PreparedLeadRows {
  const uniqueRows = new Map<string, LeadImportRow>();
  const invalidRows: PreparedLeadRows['invalidRows'] = [];
  let skippedEmpty = 0;
  let repeatedInSheet = 0;

  sourceRows.slice(startRow - 1, startRow - 1 + MAX_LEAD_IMPORT_ROWS).forEach((row, index) => {
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
      invalidRows.push({ rowNumber, reason: 'Thiếu tên lead' });
      return;
    }

    const stage = values[5] || 'Mới';
    if (!LEAD_STAGES.includes(stage as LeadStage)) {
      invalidRows.push({ rowNumber, reason: `Giai đoạn không hợp lệ: ${stage}` });
      return;
    }
    const leadValue = parseValue(row[6]);
    if (leadValue === null) {
      invalidRows.push({ rowNumber, reason: 'Giá trị cơ hội không hợp lệ' });
      return;
    }

    const lead: LeadImportRow = {
      rowNumber,
      name,
      phone: normalizedPhone,
      normalizedPhone,
      email: values[3] || '',
      source: values[4] || 'Google Sheet',
      stage: stage as LeadStage,
      value: leadValue,
      assignee: values[7] || '',
      nextAction: values[8] || '',
      nextDate: values[9] || '',
      notes: values[10] || '',
    };

    const previous = uniqueRows.get(normalizedPhone);
    if (previous) repeatedInSheet++;
    uniqueRows.set(normalizedPhone, previous ? mergeLeadRows(previous, lead, values) : lead);
  });

  return { rows: [...uniqueRows.values()], invalidRows, skippedEmpty, repeatedInSheet };
}

export function buildLeadData(row: LeadImportRow) {
  return {
    name: row.name,
    phone: row.phone,
    email: row.email || null,
    source: row.source,
    stage: row.stage,
    value: row.value,
    assignee: row.assignee || null,
    nextAction: row.nextAction || null,
    nextDate: row.nextDate || null,
    notes: row.notes || null,
  };
}
