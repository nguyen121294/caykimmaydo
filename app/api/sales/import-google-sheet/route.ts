export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { normalizeVietnamesePhone } from '@/lib/customer-phone';
import { fetchPublicGoogleWorkbook, readWorksheetRows } from '@/lib/google-sheet-workbook';
import { buildLeadData, prepareLeadRows } from '@/lib/lead-import';
import { prisma } from '@/lib/prisma';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function getExistingLeads() {
  const leads = await prisma.lead.findMany({
    select: { id: true, name: true, phone: true },
    orderBy: { createdAt: 'asc' },
  });
  const byPhone = new Map<string, (typeof leads)[number]>();
  leads.forEach(lead => {
    const phone = normalizeVietnamesePhone(lead.phone);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, lead);
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
    if (!Number.isInteger(startRow) || startRow < 1) {
      return NextResponse.json({ success: false, error: 'Hàng bắt đầu không hợp lệ.' }, { status: 400 });
    }

    const { spreadsheetId, workbook, sheetNames } = await fetchPublicGoogleWorkbook(String(payload.spreadsheetUrl || ''));
    const { sheetName, rows } = readWorksheetRows(workbook, String(payload.sheetName || ''));
    const prepared = prepareLeadRows(rows, startRow);
    const existingByPhone = await getExistingLeads();
    const duplicateRows = prepared.rows.filter(row => existingByPhone.has(row.normalizedPhone));
    const newRows = prepared.rows.filter(row => !existingByPhone.has(row.normalizedPhone));
    const preview = {
      totalRows: rows.slice(startRow - 1).length,
      validLeads: prepared.rows.length,
      newLeads: newRows.length,
      duplicateLeads: duplicateRows.length,
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
      return NextResponse.json({
        success: true,
        action,
        spreadsheetId,
        sheetUsed: sheetName,
        availableSheets: sheetNames,
        preview,
      });
    }

    let imported = 0;
    let updated = 0;
    await prisma.$transaction(async tx => {
      for (const row of prepared.rows) {
        const existing = existingByPhone.get(row.normalizedPhone);
        if (existing) {
          await tx.lead.update({ where: { id: existing.id }, data: buildLeadData(row) });
          updated++;
        } else {
          await tx.lead.create({ data: buildLeadData(row) });
          imported++;
        }
      }

      await tx.automationLog.create({
        data: {
          level: 'info',
          source: 'sales-import-google-sheet',
          message: `Import Sales sheet “${sheetName}”: ${imported} mới, ${updated} cập nhật`,
          details: JSON.stringify({ spreadsheetId, sheetName, startRow, imported, updated, preview }),
        },
      });
    });

    const skipped = prepared.invalidRows.length + prepared.skippedEmpty;
    return NextResponse.json({
      success: true,
      action,
      imported,
      updated,
      skipped,
      preview,
      sheetUsed: sheetName,
      availableSheets: sheetNames,
      message: `Đã nhập ${imported} lead mới, cập nhật ${updated} lead trùng SĐT và bỏ qua ${skipped} dòng.`,
    });
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json({
      success: false,
      error: isTimeout
        ? 'Google Sheet phản hồi quá chậm. Vui lòng thử lại.'
        : errorMessage(error, 'Lỗi server khi import Sales từ Google Sheet'),
    }, { status: isTimeout ? 504 : 500 });
  }
}
