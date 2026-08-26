import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OrderAssetType } from '@prisma/client';
import * as XLSX from 'xlsx';

import { prepareCutOrderRows } from '../lib/cut-order-import';
import { prisma } from '../lib/prisma';

type AssetType = 'PRODUCT' | 'DEPOSIT_BILL' | 'BALANCE_BILL' | 'FABRIC_BILL';

interface UploadItem {
  orderId: string;
  databaseId: string;
  type: AssetType;
  fileName: string;
  filePath: string;
}

const SOURCE_FILE = path.resolve('docs', 'caykimmaydo báo cáo thu chi 2026_edit_2608_cut.xlsx');
const UNPACKED_ROOT = path.resolve('.codex-tmp', 'cut-source-unpacked');

function storageConfig() {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'order-assets';
  if (!baseUrl || !serviceKey) {
    throw new Error('Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file môi trường (.env/.env.local).');
  }
  return { baseUrl, serviceKey, bucket };
}

function assetType(column: number): AssetType {
  if (column <= 6) return 'PRODUCT';
  if (column <= 12) return 'DEPOSIT_BILL';
  if (column <= 14) return 'BALANCE_BILL';
  return 'FABRIC_BILL';
}

function mimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function getExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  return ext || 'jpg';
}

async function buildUploadItems(): Promise<UploadItem[]> {
  const workbook = XLSX.readFile(SOURCE_FILE, { cellDates: false });
  const sheet = workbook.Sheets['QUẢN LÍ ĐƠN HÀNG'];
  if (!sheet) throw new Error('Không tìm thấy sheet "QUẢN LÍ ĐƠN HÀNG".');

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  const sourceOrders = prepareCutOrderRows(rows, 'excel-cut-2026-08-26');

  const databaseOrders = await prisma.order.findMany({
    where: { orderId: { in: sourceOrders.map(order => order.orderId) } },
    select: { id: true, orderId: true },
  });

  const databaseByOrderId = new Map(databaseOrders.map(order => [order.orderId, order.id]));
  if (databaseOrders.length === 0) {
    throw new Error('Chưa tìm thấy đơn hàng nào trong Database để liên kết ảnh.');
  }

  const orderByExcelRow = new Map(sourceOrders.map((order, index) => [index + 2, order.orderId]));

  const drawingXml = await readFile(path.join(UNPACKED_ROOT, 'xl', 'drawings', 'drawing1.xml'), 'utf8');
  const relationshipsXml = await readFile(path.join(UNPACKED_ROOT, 'xl', 'drawings', '_rels', 'drawing1.xml.rels'), 'utf8');
  
  const relationshipMap = new Map<string, string>();
  for (const match of relationshipsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="\.\.\/media\/([^"]+)"[^>]*\/>/g)) {
    relationshipMap.set(match[1], match[2]);
  }

  const unique = new Map<string, UploadItem>();
  for (const anchor of drawingXml.matchAll(/<xdr:(?:oneCellAnchor|twoCellAnchor)>[\s\S]*?<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g)) {
    const xml = anchor[0];
    const rowMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
    const columnMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/);
    const relationMatch = xml.match(/r:embed="([^"]+)"/);
    if (!rowMatch || !columnMatch || !relationMatch) continue;

    const excelRow = Math.max(2, Number(rowMatch[1]) + 1);
    const orderId = orderByExcelRow.get(excelRow);
    const fileName = relationshipMap.get(relationMatch[1]);
    if (!orderId || !fileName) continue;

    const type = assetType(Number(columnMatch[1]));
    const databaseId = databaseByOrderId.get(orderId);
    if (!databaseId) continue;

    const item: UploadItem = {
      orderId,
      databaseId,
      type,
      fileName,
      filePath: path.join(UNPACKED_ROOT, 'xl', 'media', fileName),
    };
    unique.set(`${databaseId}:${type}:${fileName}`, item);
  }

  return [...unique.values()];
}

async function uploadDirect(item: UploadItem, config: ReturnType<typeof storageConfig>) {
  // 1. Check if already exists in DB
  const existing = await prisma.orderAsset.findFirst({
    where: {
      orderId: item.databaseId,
      type: item.type as OrderAssetType,
      fileName: item.fileName,
    },
  });

  if (existing) {
    return { status: 'skipped', orderId: item.orderId, type: item.type, fileName: item.fileName };
  }

  // 2. Read bytes
  const bytes = await readFile(item.filePath);
  const mime = mimeType(item.fileName);
  const ext = getExtension(item.fileName);
  const objectPath = `${item.orderId}/${item.type.toLowerCase()}/${randomUUID()}.${ext}`;
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');

  // 3. Upload to Supabase Storage
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
    const errorText = await uploadRes.text();
    throw new Error(`Upload Storage failed (${uploadRes.status}): ${errorText}`);
  }

  const publicUrl = `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${encodedPath}`;

  // 4. Create database record
  await prisma.orderAsset.create({
    data: {
      orderId: item.databaseId,
      type: item.type as OrderAssetType,
      url: publicUrl,
      storagePath: objectPath,
      fileName: item.fileName,
      mimeType: mime,
    },
  });

  await prisma.order.update({
    where: { id: item.databaseId },
    data: { hasMedia: 'Yes' },
  });

  return { status: 'uploaded', orderId: item.orderId, type: item.type, fileName: item.fileName };
}

async function main() {
  const isApply = process.argv.includes('--apply');
  const items = await buildUploadItems();

  console.log('=== Phân tích ảnh từ Excel ===');
  console.log(`- Tổng số liên kết ảnh theo đơn: ${items.length}`);
  console.log(`- Số file ảnh gốc duy nhất: ${new Set(items.map(i => i.fileName)).size}`);

  const byType = items.reduce((acc, cur) => {
    acc[cur.type] = (acc[cur.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('- Phân loại ảnh:', byType);

  if (!isApply) {
    console.log('\n[Dry-run] Chưa kích hoạt --apply. Để tải lên Supabase và lưu DB, chạy với tham số --apply.');
    return;
  }

  const config = storageConfig();
  console.log(`\nBắt đầu tải lên Supabase Storage bucket: "${config.bucket}"...`);

  let uploaded = 0;
  let skipped = 0;
  const failures: string[] = [];
  const concurrency = 6;

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(chunk.map(item => uploadDirect(item, config)));

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        if (result.value.status === 'uploaded') uploaded++;
        else skipped++;
      } else {
        const item = chunk[idx];
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failures.push(`${item.orderId}/${item.type}/${item.fileName}: ${errorMsg}`);
      }
    });

    const progress = Math.min(i + concurrency, items.length);
    if (progress % 30 === 0 || progress === items.length) {
      console.log(`Tiến độ: ${progress}/${items.length} (Đã upload: ${uploaded}, Bỏ qua: ${skipped}, Lỗi: ${failures.length})`);
    }
  }

  console.log('\n=== KẾT QUẢ HOÀN TẤT ===');
  console.log(`✅ Upload thành công: ${uploaded}`);
  console.log(`⏭️ Đã tồn tại (bỏ qua): ${skipped}`);
  console.log(`❌ Lỗi: ${failures.length}`);

  if (failures.length > 0) {
    console.error('Mẫu lỗi:', failures.slice(0, 5));
    process.exitCode = 1;
  }
}

main()
  .catch(err => {
    console.error('Lỗi thực thi:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
