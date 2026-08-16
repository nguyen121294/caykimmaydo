export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { parse } from 'csv/sync';
import { authOptions } from '@/lib/auth-options';
import {
  buildCustomerCreate,
  buildCustomerUpdate,
  prepareCustomerRows,
} from '@/lib/customer-import';
import { normalizeVietnamesePhone } from '@/lib/customer-phone';
import { prisma } from '@/lib/prisma';

const MAX_CSV_BYTES = 5 * 1024 * 1024;

type SheetLocation = { spreadsheetId: string; gid: string };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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

async function getExistingCustomers() {
  const customers = await prisma.customer.findMany({
    select: { id: true, phone: true, normalizedPhone: true },
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body: unknown = await req.json();
    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const action = payload.action === 'import' ? 'import' : 'preview';
    const startRow = Number.parseInt(String(payload.startRow || '2'), 10);
    const location = extractSheetLocation(String(payload.spreadsheetUrl || ''));
    if (!location) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập đúng link Google Sheet.' }, { status: 400 });
    }
    if (!Number.isInteger(startRow) || startRow < 1) {
      return NextResponse.json({ success: false, error: 'Hàng bắt đầu không hợp lệ.' }, { status: 400 });
    }

    const sheetRows = await fetchSheetRows(location);
    const prepared = prepareCustomerRows(sheetRows, startRow);
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
      return NextResponse.json({ success: true, action, ...location, preview });
    }

    let imported = 0;
    let updated = 0;
    await prisma.$transaction(async tx => {
      for (const row of prepared.rows) {
        const existing = existingByPhone.get(row.normalizedPhone);
        if (existing) {
          await tx.customer.update({ where: { id: existing.id }, data: buildCustomerUpdate(row) });
          updated++;
        } else {
          await tx.customer.upsert({
            where: { normalizedPhone: row.normalizedPhone },
            update: buildCustomerUpdate(row),
            create: buildCustomerCreate(row, 'Google Sheet'),
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
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json({
      success: false,
      error: isTimeout
        ? 'Google Sheet phản hồi quá chậm. Vui lòng thử lại.'
        : errorMessage(error, 'Lỗi server khi import Google Sheet'),
    }, { status: 500 });
  }
}
