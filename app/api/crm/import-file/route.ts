export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as XLSX from 'xlsx';
import { authOptions } from '@/lib/auth-options';
import {
  buildCustomerCreate,
  buildCustomerUpdate,
  prepareCustomerRows,
} from '@/lib/customer-import';
import { normalizeVietnamesePhone } from '@/lib/customer-phone';
import { prisma } from '@/lib/prisma';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const fileValue = formData.get('file');
    const file = fileValue instanceof File ? fileValue : null;
    const sheetName = String(formData.get('sheetName') || '');
    const action = formData.get('action') === 'import' ? 'import' : 'preview';
    const startRow = Number.parseInt(String(formData.get('startRow') || '2'), 10);

    if (!file) {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn file Excel hoặc CSV để upload.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ success: false, error: 'File vượt quá giới hạn 5 MB.' }, { status: 400 });
    }
    if (!Number.isInteger(startRow) || startRow < 1) {
      return NextResponse.json({ success: false, error: 'Hàng bắt đầu không hợp lệ.' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
      return NextResponse.json({ success: false, error: 'Chỉ hỗ trợ file .xlsx, .xls hoặc .csv' }, { status: 400 });
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer', cellDates: true });
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Không thể đọc file. Kiểm tra file có đúng định dạng Excel/CSV không.',
      }, { status: 400 });
    }

    const availableSheets = workbook.SheetNames;
    let targetSheet = sheetName.trim();
    if (!targetSheet) {
      const match = availableSheets.find(name => {
        const upper = name.toUpperCase();
        return upper.includes('KHÁCH') || upper.includes('KHACH') || upper.includes('CUSTOMER');
      });
      targetSheet = match || availableSheets[0];
    }

    if (!availableSheets.includes(targetSheet)) {
      const found = availableSheets.find(name => name.toLowerCase() === targetSheet.toLowerCase());
      if (!found) {
        return NextResponse.json({
          success: false,
          error: `Không tìm thấy sheet "${targetSheet}". Các sheet có sẵn: ${availableSheets.join(', ')}`,
        }, { status: 400 });
      }
      targetSheet = found;
    }

    const worksheet = workbook.Sheets[targetSheet];
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });
    const prepared = prepareCustomerRows(allRows, startRow);
    const existingByPhone = await getExistingCustomers();
    const duplicateRows = prepared.rows.filter(row => existingByPhone.has(row.normalizedPhone));
    const newRows = prepared.rows.filter(row => !existingByPhone.has(row.normalizedPhone));
    const preview = {
      totalRows: allRows.slice(startRow - 1).length,
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
      return NextResponse.json({
        success: true,
        action,
        preview,
        sheetUsed: targetSheet,
        availableSheets,
      });
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
            create: buildCustomerCreate(row, 'Import File'),
          });
          imported++;
        }
      }

      await tx.automationLog.create({
        data: {
          level: 'info',
          source: 'import-file',
          message: `Import file "${file.name}" (sheet: ${targetSheet}): ${imported} mới, ${updated} cập nhật`,
          details: JSON.stringify({ fileName: file.name, sheetName: targetSheet, startRow, imported, updated, preview }),
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
      sheetUsed: targetSheet,
      availableSheets,
      message: `Đã nhập ${imported} khách mới và cập nhật ${updated} khách trùng SĐT; bỏ qua ${skipped} dòng.`,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: errorMessage(error, 'Lỗi server khi import file'),
    }, { status: 500 });
  }
}
