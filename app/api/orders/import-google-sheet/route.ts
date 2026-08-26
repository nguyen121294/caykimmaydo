export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { fetchPublicGoogleWorkbook, readWorksheetRows } from '@/lib/google-sheet-workbook';
import { buildOrderCreate, buildOrderUpdate, prepareOrderRows } from '@/lib/order-import';
import { prisma } from '@/lib/prisma';
import { getOrderPhonePlan } from '@/lib/order-customer';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body: unknown = await req.json();
    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const action = payload.action === 'import' ? 'import' : 'preview';
    const startRow = Number.parseInt(String(payload.startRow || '2'), 10);
    if (!Number.isInteger(startRow) || startRow < 2) {
      return NextResponse.json({ success: false, error: 'Hàng bắt đầu phải từ 2 trở lên để có hàng tiêu đề phía trên.' }, { status: 400 });
    }

    const { spreadsheetId, workbook, sheetNames } = await fetchPublicGoogleWorkbook(String(payload.spreadsheetUrl || ''));
    const { sheetName, rows } = readWorksheetRows(workbook, String(payload.sheetName || ''));
    const prepared = prepareOrderRows(rows, startRow);
    const existingOrders = await prisma.order.findMany({ select: { id: true, orderId: true } });
    const existingByOrderId = new Map(existingOrders.map(order => [order.orderId, order]));
    const duplicateRows = prepared.rows.filter(row => existingByOrderId.has(row.orderId));
    const newRows = prepared.rows.filter(row => !existingByOrderId.has(row.orderId));
    const preview = {
      totalRows: rows.slice(startRow - 1).length,
      validOrders: prepared.rows.length,
      newOrders: newRows.length,
      duplicateOrders: duplicateRows.length,
      repeatedInSheet: prepared.repeatedInSheet,
      invalidRows: prepared.invalidRows.length,
      skippedEmpty: prepared.skippedEmpty,
      duplicateSample: duplicateRows.slice(0, 8).map(row => ({
        rowNumber: row.rowNumber,
        orderId: row.orderId,
        customerName: row.customerName,
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
      const affectedCustomerIds = new Set<string>();
      for (const row of prepared.rows) {
        const existing = existingByOrderId.get(row.orderId);
        const phonePlan = getOrderPhonePlan(row.data.phone);
        let customerId: string | null = null;
        let customerName = row.customerName;
        if (phonePlan.shouldLinkCustomer && phonePlan.normalizedPhone) {
          const customer = await tx.customer.upsert({
            where: { normalizedPhone: phonePlan.normalizedPhone },
            update: {},
            create: {
              name: row.customerName,
              phone: phonePlan.phone,
              normalizedPhone: phonePlan.normalizedPhone,
              source: row.data.source || 'Google Sheet',
              status: 'Đã mua',
            },
          });
          customerId = customer.id;
          customerName = customer.name;
          affectedCustomerIds.add(customer.id);
        }
        const customerData = {
          customerId,
          customerName,
          phone: phonePlan.phone,
          needsCustomerPhone: phonePlan.needsCustomerPhone,
        };
        if (existing) {
          await tx.order.update({ where: { id: existing.id }, data: { ...buildOrderUpdate(row), ...customerData } });
          updated++;
        } else {
          await tx.order.create({ data: { ...buildOrderCreate(row), ...customerData } });
          imported++;
        }
      }

      for (const customerId of affectedCustomerIds) {
        const [summary, latest] = await Promise.all([
          tx.order.aggregate({ where: { customerId }, _count: { _all: true }, _sum: { total: true } }),
          tx.order.findFirst({ where: { customerId }, orderBy: { createdAt: 'desc' }, select: { orderId: true, orderDate: true } }),
        ]);
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalOrders: summary._count._all,
            totalSpent: summary._sum.total ?? 0,
            lastOrder: latest?.orderId ?? null,
            lastPurchaseDate: latest?.orderDate ?? null,
            status: 'Đã mua',
          },
        });
      }

      await tx.automationLog.create({
        data: {
          level: 'info',
          source: 'orders-import-google-sheet',
          message: `Import Orders sheet “${sheetName}”: ${imported} mới, ${updated} cập nhật`,
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
      message: `Đã nhập ${imported} đơn mới, cập nhật ${updated} đơn trùng mã và bỏ qua ${skipped} dòng.`,
    });
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json({
      success: false,
      error: isTimeout
        ? 'Google Sheet phản hồi quá chậm. Vui lòng thử lại.'
        : errorMessage(error, 'Lỗi server khi import Orders từ Google Sheet'),
    }, { status: isTimeout ? 504 : 500 });
  }
}
