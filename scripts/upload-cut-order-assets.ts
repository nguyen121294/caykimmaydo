import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { prepareCutOrderRows } from '../lib/cut-order-import';
import { prisma } from '../lib/prisma';
import * as XLSX from 'xlsx';

type AssetType = 'PRODUCT' | 'DEPOSIT_BILL' | 'BALANCE_BILL' | 'FABRIC_BILL';
type UploadItem = { orderId: string; databaseId: string; type: AssetType; fileName: string; filePath: string };

const BASE_URL = (process.env.ORDER_ASSET_UPLOAD_BASE_URL || 'https://mktmaydo.netlify.app').replace(/\/$/, '');
const SOURCE_FILE = path.resolve('docs', 'caykimmaydo báo cáo thu chi 2026_edit_2608_cut.xlsx');
const UNPACKED_ROOT = path.resolve('.codex-tmp', 'cut-source-unpacked');

function parseCookies(headers: Headers, cookies: Map<string, string>) {
  const values: string[] = (headers as any).getSetCookie?.() ?? [headers.get('set-cookie')].filter(Boolean);
  values.forEach(value => {
    const first = value.split(';', 1)[0];
    const separator = first.indexOf('=');
    if (separator > 0) cookies.set(first.slice(0, separator), first.slice(separator + 1));
  });
}

function cookieHeader(cookies: Map<string, string>) {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function login(): Promise<string> {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) throw new Error('Thiếu SUPERADMIN_EMAIL hoặc SUPERADMIN_PASSWORD trong môi trường local.');
  const cookies = new Map<string, string>();
  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, { redirect: 'manual' });
  parseCookies(csrfResponse.headers, cookies);
  const csrf = await csrfResponse.json() as { csrfToken?: string };
  if (!csrf.csrfToken) throw new Error('Không lấy được CSRF token từ website.');
  const body = new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: `${BASE_URL}/orders`, json: 'true' });
  const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieHeader(cookies) },
    body,
    redirect: 'manual',
  });
  parseCookies(loginResponse.headers, cookies);
  const cookie = cookieHeader(cookies);
  const check = await fetch(`${BASE_URL}/api/orders`, { headers: { Cookie: cookie }, cache: 'no-store' });
  if (!check.ok) throw new Error(`Đăng nhập website thất bại (${check.status}).`);
  return cookie;
}

function assetType(column: number): AssetType {
  if (column <= 6) return 'PRODUCT';
  if (column <= 12) return 'DEPOSIT_BILL';
  if (column <= 14) return 'BALANCE_BILL';
  return 'FABRIC_BILL';
}

function mimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function buildUploadItems(): Promise<UploadItem[]> {
  const workbook = XLSX.readFile(SOURCE_FILE, { cellDates: false });
  const sheet = workbook.Sheets['QUẢN LÍ ĐƠN HÀNG'];
  if (!sheet) throw new Error('Không tìm thấy sheet đơn hàng.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  const sourceOrders = prepareCutOrderRows(rows, 'excel-cut-2026-08-26');
  const databaseOrders = await prisma.order.findMany({
    where: { orderId: { in: sourceOrders.map(order => order.orderId) } },
    select: { id: true, orderId: true },
  });
  const databaseByOrderId = new Map(databaseOrders.map(order => [order.orderId, order.id]));
  if (databaseOrders.length !== 30) throw new Error(`Database chỉ có ${databaseOrders.length}/30 đơn của batch.`);
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
    const item = { orderId, databaseId, type, fileName, filePath: path.join(UNPACKED_ROOT, 'xl', 'media', fileName) };
    unique.set(`${databaseId}:${type}:${fileName}`, item);
  }
  return [...unique.values()];
}

async function uploadOne(item: UploadItem, cookie: string) {
  const bytes = await readFile(item.filePath);
  const form = new FormData();
  form.append('type', item.type);
  form.append('file', new Blob([bytes], { type: mimeType(item.fileName) }), item.fileName);
  const response = await fetch(`${BASE_URL}/api/orders/${encodeURIComponent(item.databaseId)}/assets/upload`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
  });
  const result = await response.json() as { ok?: boolean; skipped?: boolean; error?: string };
  if (!response.ok || !result.ok) throw new Error(`${item.orderId}/${item.type}/${item.fileName}: ${result.error || response.status}`);
  return result.skipped ? 'skipped' : 'uploaded';
}

async function main() {
  const items = await buildUploadItems();
  console.log(JSON.stringify({ uniqueSourceFiles: new Set(items.map(item => item.fileName)).size, orderAssetLinks: items.length }, null, 2));
  if (!process.argv.includes('--apply')) return;
  const cookie = await login();
  let uploaded = 0;
  let skipped = 0;
  const failures: string[] = [];
  const concurrency = 4;
  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency);
    const results = await Promise.allSettled(chunk.map(item => uploadOne(item, cookie)));
    results.forEach(result => {
      if (result.status === 'fulfilled') result.value === 'uploaded' ? uploaded++ : skipped++;
      else failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    });
    if (failures.length && uploaded + skipped === 0) {
      console.error(JSON.stringify({ stoppedEarly: true, failureSample: failures.slice(0, 4) }, null, 2));
      process.exitCode = 1;
      return;
    }
    if ((index + chunk.length) % 40 === 0 || index + chunk.length === items.length) {
      console.log(`Progress ${index + chunk.length}/${items.length}: ${uploaded} uploaded, ${skipped} skipped, ${failures.length} failed`);
    }
  }
  console.log(JSON.stringify({ uploaded, skipped, failed: failures.length, failureSample: failures.slice(0, 10) }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main()
  .catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
