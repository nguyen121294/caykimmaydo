export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { google } from 'googleapis';

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : (url.length > 20 ? url : null);
}

function calculatePoints(orderValue: number): number {
  return Math.floor(orderValue / 10000);
}

function calculateTier(points: number): string {
  if (points >= 700) return 'VIP';
  if (points >= 300) return 'Gold';
  if (points >= 100) return 'Silver';
  return 'New';
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const spreadsheetId = extractSpreadsheetId(body.spreadsheetUrl || '');
    const sheetName = body.sheetName || 'QUẢN LÍ KHÁCH HÀNG';

    if (!spreadsheetId) {
      return NextResponse.json({
        success: false,
        error: 'Thiếu Google Sheet URL hoặc Sheet ID',
      }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      return NextResponse.json({
        success: false,
        error: 'Chưa cấu hình Google Service Account. Vui lòng liên hệ admin để thiết lập GOOGLE_SERVICE_ACCOUNT_EMAIL và GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
      }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    let result;
    try {
      result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A6:K1000`,
      });
    } catch (apiErr: any) {
      const msg = apiErr?.message || '';
      if (msg.includes('not found') || msg.includes('Unable to parse range')) {
        return NextResponse.json({
          success: false,
          error: `Không tìm thấy sheet "${sheetName}". Kiểm tra tên sheet trong Google Sheets.`,
        }, { status: 400 });
      }
      if (msg.includes('403') || msg.includes('permission') || msg.includes('access')) {
        return NextResponse.json({
          success: false,
          error: `Bạn cần chia sẻ Google Sheet cho service account email: ${clientEmail}`,
        }, { status: 403 });
      }
      return NextResponse.json({
        success: false,
        error: `Google Sheets API lỗi: ${msg}`,
      }, { status: 400 });
    }

    const rows = result.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        skipped: 0,
        message: 'Sheet không có dữ liệu (từ hàng 6 trở đi).',
      });
    }

    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const [
        stt,
        completedDate,
        customerName,
        contactAccount,
        phone,
        address,
        tailoringNeed,
        measurementInfo,
        noteInfo,
        orderValueRaw,
        inactiveDaysRaw,
      ] = row.map((v: any) => (v ?? '').toString().trim());

      // Bỏ dòng trống
      if (!customerName && !phone) {
        skipped++;
        continue;
      }

      const orderValue = Number(String(orderValueRaw || '0').replace(/\./g, '').replace(/,/g, '')) || 0;
      const inactiveDays = Number(inactiveDaysRaw || 0) || 0;
      const points = calculatePoints(orderValue);

      try {
        // Tìm khách trùng SĐT
        let existing = null;
        if (phone) {
          existing = await prisma.customer.findFirst({
            where: { phone },
          });
        }

        if (existing) {
          // Cộng dồn đơn
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
              source: 'Google Sheet',
            },
          });

          // Ghi loyalty transaction nếu có orderValue
          if (orderValue > 0 && points > 0) {
            await prisma.loyaltyTransaction.create({
              data: {
                customerId: existing.id,
                type: 'earn',
                points,
                amount: orderValue,
                description: `Import Google Sheet - đơn ${orderValue.toLocaleString()}đ`,
              },
            });
          }

          updated++;
        } else {
          // Tạo mới
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
              source: 'Google Sheet',
              status: orderValue > 0 ? 'Đã mua' : 'Mới',
              tags: !phone ? 'Thiếu SĐT' : undefined,
            },
          });

          // Ghi loyalty transaction
          if (orderValue > 0 && points > 0) {
            await prisma.loyaltyTransaction.create({
              data: {
                customerId: newCustomer.id,
                type: 'earn',
                points,
                amount: orderValue,
                description: `Import Google Sheet - đơn ${orderValue.toLocaleString()}đ`,
              },
            });
          }

          imported++;
        }
      } catch (rowErr: any) {
        errors.push(`Dòng ${i + 6}: ${rowErr?.message || 'Lỗi không xác định'}`);
      }
    }

    // Log
    await prisma.automationLog.create({
      data: {
        level: 'info',
        source: 'import-google-sheet',
        message: `Import Google Sheet: ${imported} mới, ${updated} cập nhật, ${skipped} bỏ qua`,
        details: JSON.stringify({ spreadsheetId, sheetName, imported, updated, skipped, errorCount: errors.length }),
      },
    });

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Import thành công: ${imported} khách mới, ${updated} khách cập nhật, ${skipped} dòng bỏ qua${errors.length > 0 ? `, ${errors.length} dòng lỗi` : ''}`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message ?? 'Lỗi server khi import Google Sheet',
    }, { status: 500 });
  }
}
