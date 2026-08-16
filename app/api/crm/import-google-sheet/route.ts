export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { parse } from 'csv/sync';
import { authOptions } from '@/lib/auth-options';
import { normalizeVietnamesePhone } from '@/lib/customer-phone';
import { prisma } from '@/lib/prisma';

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_DATA_ROWS = 5000;

type SheetLocation = { spreadsheetId: string; gid: string };
type CustomerRow = {
  sourceKey: string;
  rowNumber: number;
  stt: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  completedDate: string;
  contactAccount: string;
  address: string;
  tailoringNeed: string;
  measurementInfo: string;
  noteInfo: string;
  inactiveDays: number | null;
};

function extractSheetLocation(value: string): SheetLocation | null {
  try {
    const url = new URL(value);
    if (url.hostname !== 'docs.google.com') return null;
    const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    return {
      spreadsheetId: match[1],
      gid: url.searchParams.get('gid') || hashParams.get('gid') || '0',
    };
  } catch {
    return null;
  }
}

async function fetchSheetRows(location: SheetLocation): Promise<string[][]> {
  const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${location.spreadsheetId}/export`);
  exportUrl.searchParams.set('format', 'csv');
  exportUrl.searchParams.set('gid', location.gid);

  const response = await fetch(exportUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Không thể đọc Google Sheet. Hãy bật quyền Anyone with the link – Viewer.');

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_CSV_BYTES) throw new Error('Google Sheet vượt quá giới hạn 5 MB.');

  const csv = await response.text();
  if (csv.length > MAX_CSV_BYTES) throw new Error('Google Sheet vượt quá giới hạn 5 MB.');
  if (csv.trimStart().startsWith('<')) {
    throw new Error('Google Sheet chưa được chia sẻ công khai hoặc link không hợp lệ.');
  }

  return parse(csv, { bom: true, relax_column_count: true, skip_empty_lines: false });
}

function mergeNonEmpty(previous: CustomerRow, current: CustomerRow): CustomerRow {
  return {
    ...previous,
    ...Object.fromEntries(
      Object.entries(current).filter(([, value]) => value !== '' && value !== null),
    ),
    sourceKey: current.sourceKey,
    rowNumber: current.rowNumber,
    inactiveDays: current.inactiveDays ?? previous.inactiveDays,
  } as CustomerRow;
}

function prepareRows(rows: string[][], location: SheetLocation, startRow: number) {
  const uniqueRows = new Map<string, CustomerRow>();
  const invalidRows: Array<{ rowNumber: number; reason: string }> = [];
  let skippedEmpty = 0;
  let repeatedInSheet = 0;

  rows.slice(startRow - 1, startRow - 1 + MAX_DATA_ROWS).forEach((row, index) => {
    const rowNumber = startRow + index;
    const values = row.map(value => String(value ?? '').trim());
    const name = values[2] || '';
    const rawPhone = values[4] || '';
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

    const customer: CustomerRow = {
      sourceKey: `${location.spreadsheetId}:${location.gid}:${values[0] || rowNumber}:${normalizedPhone}`,
      rowNumber,
      stt: values[0] || '',
      name,
      phone: rawPhone,
      normalizedPhone,
      completedDate: values[1] || '',
      contactAccount: values[3] || '',
      address: values[5] || '',
      tailoringNeed: values[6] || '',
      measurementInfo: values[7] || '',
      noteInfo: values[8] || '',
      inactiveDays: values[10]
        ? Number(values[10].replace(/\D/g, '')) || 0
        : null,
    };

    const previous = uniqueRows.get(normalizedPhone);
    if (previous) repeatedInSheet++;
    uniqueRows.set(normalizedPhone, previous ? mergeNonEmpty(previous, customer) : customer);
  });

  return { rows: [...uniqueRows.values()], invalidRows, skippedEmpty, repeatedInSheet };
}

async function getExistingCustomers() {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true, normalizedPhone: true },
    orderBy: { createdAt: 'asc' },
  });
  const byPhone = new Map<string, (typeof customers)[number]>();

  customers.forEach(customer => {
    if (customer.normalizedPhone) byPhone.set(customer.normalizedPhone, customer);
  });
  customers.forEach(customer => {
    const phone = normalizeVietnamesePhone(customer.phone);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, customer);
  });
  return byPhone;
}

function buildCustomerData(row: CustomerRow) {
  return {
    name: row.name,
    phone: row.normalizedPhone,
    normalizedPhone: row.normalizedPhone,
    ...(row.contactAccount && { contactAccount: row.contactAccount }),
    ...(row.address && { address: row.address }),
    ...(row.tailoringNeed && { tailoringNeed: row.tailoringNeed }),
    ...(row.measurementInfo && { measurementInfo: row.measurementInfo }),
    ...(row.noteInfo && { noteInfo: row.noteInfo }),
    ...(row.completedDate && { completedDate: row.completedDate }),
    ...(row.inactiveDays !== null && { inactiveDays: row.inactiveDays }),
    source: 'Google Sheet',
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action === 'import' ? 'import' : 'preview';
    const startRow = Number.parseInt(String(body.startRow || '6'), 10);
    const location = extractSheetLocation(String(body.spreadsheetUrl || ''));
    if (!location) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập đúng link Google Sheet.' }, { status: 400 });
    }
    if (!Number.isInteger(startRow) || startRow < 1) {
      return NextResponse.json({ success: false, error: 'Hàng bắt đầu không hợp lệ.' }, { status: 400 });
    }

    const sheetRows = await fetchSheetRows(location);
    const prepared = prepareRows(sheetRows, location, startRow);
    const existingByPhone = await getExistingCustomers();
    const duplicateRows = prepared.rows.filter(row => existingByPhone.has(row.normalizedPhone));
    const newRows = prepared.rows.filter(row => !existingByPhone.has(row.normalizedPhone));
    const preview = {
      totalRows: sheetRows.slice(startRow - 1).length,
      validCustomers: prepared.rows.length,
      newCustomers: newRows.length,
      duplicateCustomers: duplicateRows.length,
      repeatedInSheet: prepared.repeatedInSheet,
      invalidRows: prepared.invalidRows.length,
      skippedEmpty: prepared.skippedEmpty,
      duplicateSample: duplicateRows.slice(0, 8).map(row => ({
        rowNumber: row.rowNumber,
        name: row.name,
        phone: row.normalizedPhone,
      })),
      invalidSample: prepared.invalidRows.slice(0, 8),
    };

    if (action === 'preview') {
      return NextResponse.json({ success: true, action, spreadsheetId: location.spreadsheetId, gid: location.gid, preview });
    }

    let imported = 0;
    let updated = 0;
    await prisma.$transaction(async tx => {
      for (const row of prepared.rows) {
        const existing = existingByPhone.get(row.normalizedPhone);
        if (existing) {
          await tx.customer.update({ where: { id: existing.id }, data: buildCustomerData(row) });
          updated++;
        } else {
          await tx.customer.upsert({
            where: { normalizedPhone: row.normalizedPhone },
            update: buildCustomerData(row),
            create: { ...buildCustomerData(row), status: 'Mới' },
          });
          imported++;
        }
      }

      await tx.automationLog.create({
        data: {
          level: 'info',
          source: 'import-google-sheet',
          message: `Import hồ sơ khách hàng: ${imported} mới, ${updated} cập nhật`,
          details: JSON.stringify({ ...location, startRow, imported, updated, preview }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      action,
      imported,
      updated,
      skipped: prepared.invalidRows.length + prepared.skippedEmpty,
      preview,
      message: `Đã nhập ${imported} khách mới và cập nhật ${updated} khách trùng SĐT.`,
    });
  } catch (error: any) {
    const message = error?.name === 'TimeoutError'
      ? 'Google Sheet phản hồi quá chậm. Vui lòng thử lại.'
      : error?.message || 'Lỗi server khi import Google Sheet';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
