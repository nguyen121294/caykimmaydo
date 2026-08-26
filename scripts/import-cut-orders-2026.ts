import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import * as XLSX from 'xlsx';

import { prepareCutOrderRows } from '../lib/cut-order-import';
import { getOrderPhonePlan } from '../lib/order-customer';
import { prisma } from '../lib/prisma';

const SOURCE_FILE = path.resolve('docs', 'caykimmaydo báo cáo thu chi 2026_edit_2608_cut.xlsx');
const SHEET_NAME = 'QUẢN LÍ ĐƠN HÀNG';
const IMPORT_BATCH_ID = 'excel-cut-2026-08-26';

function loadOrders() {
  const workbook = XLSX.readFile(SOURCE_FILE, { cellDates: false, dense: false });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Không tìm thấy sheet “${SHEET_NAME}”.`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  const orders = prepareCutOrderRows(rows, IMPORT_BATCH_ID);
  if (orders.length !== 30) throw new Error(`Dừng import: cần đúng 30 đơn nhưng đọc được ${orders.length}.`);
  return orders;
}

function printPreview(orders: ReturnType<typeof loadOrders>) {
  const missingPhone = orders.filter(order => order.needsCustomerPhone);
  const missingDates = orders.filter(order => !order.orderDate || !order.expectedDate);
  console.log(JSON.stringify({
    source: SOURCE_FILE,
    batch: IMPORT_BATCH_ID,
    orders: orders.length,
    first: { orderId: orders[0].orderId, orderDate: orders[0].orderDate, expectedDate: orders[0].expectedDate },
    last: { orderId: orders.at(-1)?.orderId, orderDate: orders.at(-1)?.orderDate, expectedDate: orders.at(-1)?.expectedDate },
    missingPhone: missingPhone.length,
    missingPhoneOrders: missingPhone.map(order => order.orderId),
    missingDatePairs: missingDates.length,
    missingDateOrders: missingDates.map(order => order.orderId),
    fabricCostTotal: orders.reduce((sum, order) => sum + order.fabricCost, 0),
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
  }, null, 2));
}

async function backupCurrentData() {
  const backupDir = path.resolve('backups');
  await mkdir(backupDir, { recursive: true });
  const [orders, customers, assets] = await Promise.all([
    prisma.order.findMany({ include: { assets: true } }),
    prisma.customer.findMany(),
    prisma.orderAsset.findMany(),
  ]);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `orders-crm-before-${IMPORT_BATCH_ID}-${stamp}.json`);
  await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), orders, customers, assets }, null, 2), 'utf8');
  return backupPath;
}

async function applyImport(orders: ReturnType<typeof loadOrders>) {
  const backupPath = await backupCurrentData();
  const existing = await prisma.order.findMany({ where: { orderId: { in: orders.map(order => order.orderId) } }, select: { orderId: true } });
  const existingIds = new Set(existing.map(order => order.orderId));
  const affectedCustomerIds = new Set<string>();

  await prisma.$transaction(async tx => {
    for (const source of orders) {
      const phonePlan = getOrderPhonePlan(source.phone);
      let customerId: string | null = null;
      if (phonePlan.shouldLinkCustomer && phonePlan.normalizedPhone) {
        const customer = await tx.customer.upsert({
          where: { normalizedPhone: phonePlan.normalizedPhone },
          update: {},
          create: {
            name: source.customerName,
            phone: phonePlan.phone,
            normalizedPhone: phonePlan.normalizedPhone,
            address: source.deliveryAddress,
            source: source.source,
            status: 'Đã mua',
          },
        });
        customerId = customer.id;
        affectedCustomerIds.add(customer.id);
      }

      const data = {
        customerName: source.customerName,
        phone: source.phone,
        customerId,
        needsCustomerPhone: source.needsCustomerPhone,
        product: source.product,
        productType: source.productType,
        quantity: source.quantity,
        fabricType: source.fabricType,
        tailorName: source.tailorName,
        orderDate: source.orderDate,
        expectedDate: source.expectedDate,
        deliveryDate: source.deliveryDate,
        deliveryAddress: source.deliveryAddress,
        listPrice: source.listPrice,
        discountAmount: source.discountAmount,
        total: source.total,
        deposit: source.deposit,
        price: String(source.total),
        paymentMethod: source.paymentMethod,
        paymentAccount: source.paymentAccount,
        tailorCost: source.tailorCost,
        fabricCost: source.fabricCost,
        shippingFee: source.shippingFee,
        status: source.status,
        notes: source.notes,
        source: source.source,
        importBatchId: source.importBatchId,
        hasMedia: 'Yes',
      };
      await tx.order.upsert({
        where: { orderId: source.orderId },
        update: data,
        create: { orderId: source.orderId, ...data },
      });
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
        source: 'orders-import-cut-excel',
        message: `Import ${orders.length} Orders từ file cut ngày 26/08/2026`,
        details: JSON.stringify({ batch: IMPORT_BATCH_ID, created: orders.length - existingIds.size, updated: existingIds.size, missingPhone: orders.filter(order => order.needsCustomerPhone).length }),
      },
    });
  }, { timeout: 60_000 });

  console.log(JSON.stringify({
    ok: true,
    backupPath,
    created: orders.length - existingIds.size,
    updated: existingIds.size,
    linkedCustomers: affectedCustomerIds.size,
    placeholderOrders: orders.filter(order => order.needsCustomerPhone).length,
  }, null, 2));
}

async function main() {
  const orders = loadOrders();
  printPreview(orders);
  if (!process.argv.includes('--apply')) return;
  await applyImport(orders);
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
