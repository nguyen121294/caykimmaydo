export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import * as XLSX from 'xlsx';

function calculatePoints(orderValue: number): number {
  return Math.floor(orderValue / 10000);
}

function calculateTier(points: number): string {
  if (points >= 700) return 'VIP';
  if (points >= 300) return 'Gold';
  if (points >= 100) return 'Silver';
  return 'New';
}

function normalizeMoney(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val);
  return Number(String(val).replace(/\./g, '').replace(/,/g, '').replace(/[^\d-]/g, '')) || 0;
}

function normalizePhone(val: any): string {
  if (!val) return '';
  return String(val).trim().replace(/\s+/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sheetName = (formData.get('sheetName') as string) || '';
    const startRow = parseInt((formData.get('startRow') as string) || '6', 10);

    if (!file) {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn file Excel hoặc CSV để upload.' }, { status: 400 });
    }

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      return NextResponse.json({
        success: false,
        error: 'Chỉ hỗ trợ file .xlsx, .xls hoặc .csv',
      }, { status: 400 });
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Không thể đọc file. Kiểm tra file có đúng định dạng Excel/CSV không.',
      }, { status: 400 });
    }

    // Select sheet
    const availableSheets = workbook.SheetNames;
    let targetSheet = sheetName.trim();

    if (!targetSheet) {
      // Tự tìm sheet phù hợp
      const match = availableSheets.find(s =>
        s.toUpperCase().includes('KHÁCH') || s.toUpperCase().includes('KHACH') || s.toUpperCase().includes('CUSTOMER')
      );
      targetSheet = match || availableSheets[0];
    }

    if (!availableSheets.includes(targetSheet)) {
      // Thử tìm case-insensitive
      const found = availableSheets.find(s => s.toLowerCase() === targetSheet.toLowerCase());
      if (found) {
        targetSheet = found;
      } else {
        return NextResponse.json({
          success: false,
          error: `Không tìm thấy sheet "${targetSheet}". Các sheet có sẵn: ${availableSheets.join(', ')}`,
        }, { status: 400 });
      }
    }

    const worksheet = workbook.Sheets[targetSheet];
    // Convert to array of arrays (header_index: 1 for 1-based)
    const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Skip rows before startRow (1-indexed)
    const dataStartIdx = startRow - 1; // Convert to 0-indexed
    if (dataStartIdx >= allRows.length) {
      return NextResponse.json({
        success: true,
        imported: 0,
        updated: 0,
        skipped: 0,
        message: `Sheet "${targetSheet}" không có dữ liệu từ hàng ${startRow} trở đi.`,
      });
    }

    const dataRows = allRows.slice(dataStartIdx);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) { skipped++; continue; }

      // Map columns: A=STT, B=Ngày hoàn thành, C=Tên khách, D=Tài khoản liên hệ,
      // E=SĐT, F=Địa chỉ, G=Nhu cầu may đo, H=Thông tin số đo,
      // I=Thông tin lưu ý, J=Giá trị đơn hàng, K=Ngày gián đoạn
      const customerName = String(row[2] ?? '').trim();
      const phone = normalizePhone(row[4]);
      const contactAccount = String(row[3] ?? '').trim();
      const address = String(row[5] ?? '').trim();
      const tailoringNeed = String(row[6] ?? '').trim();
      const measurementInfo = String(row[7] ?? '').trim();
      const noteInfo = String(row[8] ?? '').trim();
      const orderValue = normalizeMoney(row[9]);
      const completedDate = String(row[1] ?? '').trim();
      const inactiveDays = Number(String(row[10] ?? '0').replace(/[^\d]/g, '')) || 0;

      // Skip empty rows
      if (!customerName && !phone) {
        skipped++;
        continue;
      }

      const points = calculatePoints(orderValue);

      try {
        let existing = null;
        if (phone) {
          existing = await prisma.customer.findFirst({ where: { phone } });
        }

        if (existing) {
          const newTotalSpent = existing.totalSpent + orderValue;
          const newTotalOrders = existing.totalOrders + (orderValue > 0 ? 1 : 0);
          const newPoints = existing.loyaltyPoints + points;

          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              name: customerName || existing.name,
              contactAccount: contactAccount || existing.contactAccount,
              address: address || existing.address,
              tailoringNeed: tailoringNeed || existing.tailoringNeed,
              measurementInfo: measurementInfo || existing.measurementInfo,
              noteInfo: noteInfo || existing.noteInfo,
              completedDate: completedDate || existing.completedDate,
              inactiveDays,
              totalSpent: newTotalSpent,
              totalOrders: newTotalOrders,
              loyaltyPoints: newPoints,
              loyaltyTier: calculateTier(newPoints),
              lastPurchaseDate: completedDate || existing.lastPurchaseDate,
              source: 'Import File',
            },
          });

          if (orderValue > 0 && points > 0) {
            await prisma.loyaltyTransaction.create({
              data: {
                customerId: existing.id,
                type: 'earn',
                points,
                amount: orderValue,
                description: `Import file - đơn ${orderValue.toLocaleString('vi-VN')}đ`,
              },
            });
          }
          updated++;
        } else {
          const newCustomer = await prisma.customer.create({
            data: {
              name: customerName || 'Chưa có tên',
              phone: phone || null,
              contactAccount,
              address,
              tailoringNeed,
              measurementInfo,
              noteInfo: noteInfo || null,
              completedDate,
              inactiveDays,
              totalSpent: orderValue,
              totalOrders: orderValue > 0 ? 1 : 0,
              loyaltyPoints: points,
              loyaltyTier: calculateTier(points),
              lastPurchaseDate: completedDate || null,
              source: 'Import File',
              status: orderValue > 0 ? 'Đã mua' : 'Mới',
              tags: !phone ? 'Thiếu SĐT' : undefined,
            },
          });

          if (orderValue > 0 && points > 0) {
            await prisma.loyaltyTransaction.create({
              data: {
                customerId: newCustomer.id,
                type: 'earn',
                points,
                amount: orderValue,
                description: `Import file - đơn ${orderValue.toLocaleString('vi-VN')}đ`,
              },
            });
          }
          imported++;
        }
      } catch (rowErr: any) {
        errors.push(`Dòng ${startRow + i}: ${rowErr?.message || 'Lỗi không xác định'}`);
      }
    }

    // Log
    await prisma.automationLog.create({
      data: {
        level: 'info',
        source: 'import-file',
        message: `Import file "${file.name}" (sheet: ${targetSheet}): ${imported} mới, ${updated} cập nhật, ${skipped} bỏ qua`,
        details: JSON.stringify({ fileName: file.name, sheetName: targetSheet, startRow, imported, updated, skipped, errorCount: errors.length }),
      },
    });

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      sheetUsed: targetSheet,
      availableSheets,
      errors: errors.length > 0 ? errors : undefined,
      message: `Import thành công: ${imported} khách mới, ${updated} cập nhật, ${skipped} bỏ qua${errors.length > 0 ? `, ${errors.length} dòng lỗi` : ''}`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message ?? 'Lỗi server khi import file',
    }, { status: 500 });
  }
}
