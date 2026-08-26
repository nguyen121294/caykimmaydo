import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { OrderAssetType, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

import { normalizeVietnamesePhone } from '../lib/customer-phone';
import { prisma } from '../lib/prisma';

const FILE_PATH = path.resolve('docs', 'edit_ckmd.xlsx');
const UNPACK_DIR = path.resolve('.codex-tmp', 'edit-ckmd-unpacked');
const IMPORT_BATCH_ID = 'excel-edit-ckmd-2026-08-27';
const MISSING_PHONE_DEFAULT = '1111111111';

function storageConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'order-assets';
  if (!baseUrl || !serviceKey) {
    throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
  }
  return { baseUrl, serviceKey, bucket };
}

function serialToIso(serial: any): string | null {
  const num = Number(serial);
  if (!Number.isFinite(num) || num <= 0) return null;
  const timestamp = Date.UTC(1899, 11, 30) + Math.floor(num) * 86_400_000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function text(val: any): string {
  return String(val ?? '').trim();
}

function money(val: any): number {
  if (typeof val === 'number') return Number.isFinite(val) ? Math.round(val) : 0;
  const raw = text(val);
  if (!raw) return 0;
  const parsed = Number(raw.replace(/[.,\s]/g, '').replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeStatus(val: any): string {
  const raw = text(val).toLowerCase();
  if (!raw) return 'Mới nhận';
  if (['done', 'đã xong', 'hoàn tất', 'đã giao'].includes(raw)) return 'Đã giao';
  if (raw.includes('hủy')) return 'Hủy';
  return text(val);
}

function assetType(col: number): OrderAssetType {
  if (col <= 6) return OrderAssetType.PRODUCT;
  if (col <= 12) return OrderAssetType.DEPOSIT_BILL;
  if (col <= 14) return OrderAssetType.BALANCE_BILL;
  return OrderAssetType.FABRIC_BILL;
}

function mimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function getExt(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  return ext || 'jpg';
}

interface ParsedOrder {
  excelRow: number;
  sequence: number;
  orderId: string;
  orderDate: string | null;
  deliveryDate: string | null;
  customerName: string;
  phone: string;
  normalizedPhone: string | null;
  needsCustomerPhone: boolean;
  address: string | null;
  product: string;
  listPrice: number;
  discountAmount: number;
  total: number;
  deposit: number;
  tailorName: string | null;
  tailorCost: number;
  fabricCost: number;
  shippingFee: number;
  status: string;
  notes: string | null;
  paymentMethod: string | null;
  paymentAccount: string | null;
}

interface ParsedAsset {
  excelRow: number;
  orderId: string;
  type: OrderAssetType;
  fileName: string;
  filePath: string;
}

async function parseExcelAndAssets(): Promise<{ orders: ParsedOrder[]; assets: ParsedAsset[] }> {
  const workbook = XLSX.readFile(FILE_PATH, { cellDates: false, raw: true });
  const sheet = workbook.Sheets['QUẢN LÍ ĐƠN HÀNG'];
  if (!sheet) throw new Error('Không tìm thấy sheet "QUẢN LÍ ĐƠN HÀNG".');

  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });

  const orders: ParsedOrder[] = [];
  const rowToOrderId = new Map<number, string>();
  const sequenceByMonth = new Map<string, number>();

  rows.forEach((row, idx) => {
    if (idx === 0) return;
    const excelRow = idx + 1;
    const ad = row[29]; // Cột AD: Ngày đặt
    const ae = row[30]; // Cột AE: Ngày giao

    // Rule: Chỉ lấy các dòng có cột AD - AE có giá trị
    if (ad === '' || ad === null || ad === undefined) return;

    const orderDate = serialToIso(ad);
    const deliveryDate = serialToIso(ae);
    const month = orderDate ? orderDate.slice(0, 7) : '2026-08';
    const monthSeq = (sequenceByMonth.get(month) ?? 0) + 1;
    sequenceByMonth.set(month, monthSeq);

    const orderId = `CAY-${month}-${String(monthSeq).padStart(3, '0')}`;
    rowToOrderId.set(excelRow, orderId);

    const rawPhone = text(row[4]);
    const normalizedPhone = normalizeVietnamesePhone(rawPhone);
    const needsCustomerPhone = !normalizedPhone;

    orders.push({
      excelRow,
      sequence: Number(row[0]) || monthSeq,
      orderId,
      orderDate,
      deliveryDate,
      customerName: text(row[3]) || 'Khách hàng may đo',
      phone: normalizedPhone ?? (rawPhone || MISSING_PHONE_DEFAULT),
      normalizedPhone,
      needsCustomerPhone,
      address: text(row[5]) || null,
      product: text(row[6]) || 'Sản phẩm may đo',
      listPrice: money(row[7]) || money(row[9]),
      discountAmount: money(row[8]),
      total: money(row[9]) || money(row[7]),
      deposit: money(row[11]),
      tailorName: text(row[20]) || null,
      tailorCost: money(row[21]),
      fabricCost: money(row[22]),
      shippingFee: money(row[23]),
      status: normalizeStatus(row[10]),
      notes: text(row[6]) || null,
      paymentMethod: text(row[18]) || null,
      paymentAccount: text(row[19]) || null,
    });
  });

  // Parse Drawings
  const drawingXmlPath = path.join(UNPACK_DIR, 'xl', 'drawings', 'drawing1.xml');
  const relsXmlPath = path.join(UNPACK_DIR, 'xl', 'drawings', '_rels', 'drawing1.xml.rels');

  const assets: ParsedAsset[] = [];
  if (fs.existsSync(drawingXmlPath) && fs.existsSync(relsXmlPath)) {
    const drawingXml = fs.readFileSync(drawingXmlPath, 'utf8');
    const relsXml = fs.readFileSync(relsXmlPath, 'utf8');

    const relMap = new Map<string, string>();
    for (const match of relsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="\.\.\/media\/([^"]+)"[^>]*\/>/g)) {
      relMap.set(match[1], match[2]);
    }

    const uniqueAssetKeys = new Set<string>();

    for (const anchor of drawingXml.matchAll(/<xdr:(?:oneCellAnchor|twoCellAnchor)>[\s\S]*?<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g)) {
      const xml = anchor[0];
      const rowMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
      const colMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/);
      const relMatch = xml.match(/r:embed="([^"]+)"/);
      if (!rowMatch || !colMatch || !relMatch) continue;

      const excelRow = Number(rowMatch[1]) + 1;
      const colIdx = Number(colMatch[1]);
      const rId = relMatch[1];
      const fileName = relMap.get(rId);
      if (!fileName) continue;

      // Rule: Chỉ lấy hình thuộc dòng hợp lệ có AD-AE
      const orderId = rowToOrderId.get(excelRow);
      if (!orderId) continue;

      const type = assetType(colIdx);
      const key = `${orderId}:${type}:${fileName}`;
      if (uniqueAssetKeys.has(key)) continue;
      uniqueAssetKeys.add(key);

      assets.push({
        excelRow,
        orderId,
        type,
        fileName,
        filePath: path.join(UNPACK_DIR, 'xl', 'media', fileName),
      });
    }
  }

  return { orders, assets };
}

async function main() {
  const isApply = process.argv.includes('--apply');
  console.log('=== CHUẨN BỊ IMPORT DỮ LIỆU MỚI (edit_ckmd.xlsx) ===');

  const { orders, assets } = await parseExcelAndAssets();

  console.log(`- Tổng số đơn hàng hợp lệ (theo cột AD-AE): ${orders.length} đơn`);
  console.log(`- Tổng số hình ảnh đi kèm chính xác: ${assets.length} ảnh`);

  const assetCountsByType = assets.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('- Phân loại ảnh:', assetCountsByType);

  if (!isApply) {
    console.log('\n[Dry-run] Chưa kích hoạt --apply.');
    console.log('Mẫu 3 đơn hàng đầu tiên:');
    console.log(orders.slice(0, 3));
    console.log('\nĐể áp dụng cập nhật sạch vào Database và Storage, hãy chạy với tham số --apply.');
    return;
  }

  const config = storageConfig();
  console.log('\n1. Cập nhật Đơn hàng & Khách hàng vào Database...');

  const dbOrdersByOrderId = new Map<string, string>(); // orderId -> db id

  for (const ord of orders) {
    let customerId: string | null = null;
    if (ord.normalizedPhone) {
      const customer = await prisma.customer.upsert({
        where: { normalizedPhone: ord.normalizedPhone },
        update: {
          name: ord.customerName,
          phone: ord.phone,
          address: ord.address ?? undefined,
          status: 'Đã mua',
        },
        create: {
          name: ord.customerName,
          phone: ord.phone,
          normalizedPhone: ord.normalizedPhone,
          address: ord.address,
          status: 'Đã mua',
        },
      });
      customerId = customer.id;
    }

    const dbOrder = await prisma.order.upsert({
      where: { orderId: ord.orderId },
      update: {
        customerName: ord.customerName,
        phone: ord.phone,
        customerId,
        needsCustomerPhone: ord.needsCustomerPhone,
        product: ord.product,
        orderDate: ord.orderDate,
        expectedDate: ord.deliveryDate,
        deliveryDate: ord.deliveryDate,
        deliveryAddress: ord.address,
        listPrice: ord.listPrice,
        discountAmount: ord.discountAmount,
        total: ord.total,
        deposit: ord.deposit,
        tailorName: ord.tailorName,
        tailorCost: ord.tailorCost,
        fabricCost: ord.fabricCost,
        shippingFee: ord.shippingFee,
        status: ord.status,
        notes: ord.notes,
        paymentMethod: ord.paymentMethod,
        paymentAccount: ord.paymentAccount,
        importBatchId: IMPORT_BATCH_ID,
        hasMedia: 'Yes',
      },
      create: {
        orderId: ord.orderId,
        customerName: ord.customerName,
        phone: ord.phone,
        customerId,
        needsCustomerPhone: ord.needsCustomerPhone,
        product: ord.product,
        orderDate: ord.orderDate,
        expectedDate: ord.deliveryDate,
        deliveryDate: ord.deliveryDate,
        deliveryAddress: ord.address,
        listPrice: ord.listPrice,
        discountAmount: ord.discountAmount,
        total: ord.total,
        deposit: ord.deposit,
        tailorName: ord.tailorName,
        tailorCost: ord.tailorCost,
        fabricCost: ord.fabricCost,
        shippingFee: ord.shippingFee,
        status: ord.status,
        notes: ord.notes,
        paymentMethod: ord.paymentMethod,
        paymentAccount: ord.paymentAccount,
        importBatchId: IMPORT_BATCH_ID,
        hasMedia: 'Yes',
      },
    });

    dbOrdersByOrderId.set(ord.orderId, dbOrder.id);
  }

  console.log(`✅ Đã cập nhật ${dbOrdersByOrderId.size} đơn hàng trong Database.`);

  console.log('\n2. Dọn dẹp OrderAsset cũ của 30 đơn này...');
  const deletedAssets = await prisma.orderAsset.deleteMany({
    where: {
      orderId: { in: [...dbOrdersByOrderId.values()] },
    },
  });
  console.log(`🗑️ Đã xóa ${deletedAssets.count} ảnh rác cũ khỏi Database.`);

  console.log(`\n3. Bắt đầu tải lên ${assets.length} ảnh sạch lên Supabase Storage...`);
  let uploaded = 0;
  const failures: string[] = [];
  const concurrency = 6;

  for (let i = 0; i < assets.length; i += concurrency) {
    const chunk = assets.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async item => {
        try {
          const dbOrderId = dbOrdersByOrderId.get(item.orderId);
          if (!dbOrderId) throw new Error(`Không tìm thấy dbOrderId cho ${item.orderId}`);

          const bytes = await readFile(item.filePath);
          const mime = mimeType(item.fileName);
          const ext = getExt(item.fileName);
          const objectPath = `${item.orderId}/${item.type.toLowerCase()}/${randomUUID()}.${ext}`;
          const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');

          const uploadRes = await fetch(`${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodedPath}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.serviceKey}`,
              apikey: config.serviceKey,
              'Content-Type': mime,
              'x-upsert': 'false',
            },
            body: bytes,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload fail (${uploadRes.status}): ${await uploadRes.text()}`);
          }

          const publicUrl = `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${encodedPath}`;

          await prisma.orderAsset.create({
            data: {
              orderId: dbOrderId,
              type: item.type,
              url: publicUrl,
              storagePath: objectPath,
              fileName: item.fileName,
              mimeType: mime,
            },
          });
          uploaded++;
        } catch (err: any) {
          failures.push(`${item.orderId}/${item.type}/${item.fileName}: ${err.message}`);
        }
      })
    );

    const progress = Math.min(i + concurrency, assets.length);
    console.log(`Tiến độ upload: ${progress}/${assets.length} (Đã xong: ${uploaded}, Lỗi: ${failures.length})`);
  }

  console.log('\n=== HOÀN TẤT ĐỒNG BỘ TOÀN DIỆN ===');
  console.log(`✅ Đơn hàng cập nhật: ${dbOrdersByOrderId.size}`);
  console.log(`✅ Ảnh upload & liên kết thành công: ${uploaded}/${assets.length}`);
  console.log(`❌ Lỗi: ${failures.length}`);
  if (failures.length > 0) {
    console.error('Mẫu lỗi:', failures.slice(0, 5));
    process.exitCode = 1;
  }
}

main()
  .catch(err => {
    console.error('Lỗi thực thi:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
