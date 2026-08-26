import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

const filePath = path.resolve('docs', 'edit_ckmd.xlsx');
const unpackDir = path.resolve('.codex-tmp', 'edit-ckmd-unpacked');

console.log('1. Reading workbook...');
const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
console.log('Sheets:', workbook.SheetNames);

const sheetName = 'QUẢN LÍ ĐƠN HÀNG';
const sheet = workbook.Sheets[sheetName];
if (!sheet) {
  throw new Error(`Không tìm thấy sheet "${sheetName}"`);
}

const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });
console.log(`\n=== Sheet: "${sheetName}" (Total rows: ${rows.length}) ===`);

function serialToDate(serial: any): string {
  const num = Number(serial);
  if (!Number.isFinite(num) || num <= 0) return String(serial || '');
  const timestamp = Date.UTC(1899, 11, 30) + Math.floor(num) * 86_400_000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

interface ValidRow {
  rowNumber: number; // 1-indexed in Excel
  sequence: any;
  orderDateSerial: any;
  orderDate: string;
  deliveryDateSerial: any;
  deliveryDate: string;
  customerName: string;
  phone: string;
  product: string;
  price: any;
  total: any;
  deposit: any;
  remaining: any;
  tailorCost: any;
  fabricCost: any;
}

const validRows: ValidRow[] = [];
const validRowNumbers = new Set<number>();

rows.forEach((row, idx) => {
  if (idx === 0) return; // skip header
  const rowNumber = idx + 1;
  const ad = row[29]; // Cột AD (index 29)
  const ae = row[30]; // Cột AE (index 30)

  // Rule: Cột AD - AE có giá trị thì data cần import vào database
  if (ad !== '' && ad !== null && ad !== undefined) {
    validRowNumbers.add(rowNumber);
    validRows.push({
      rowNumber,
      sequence: row[0],
      orderDateSerial: ad,
      orderDate: serialToDate(ad),
      deliveryDateSerial: ae,
      deliveryDate: serialToDate(ae),
      customerName: String(row[3] || '').trim(),
      phone: String(row[4] || '').trim(),
      product: String(row[5] || 'Sản phẩm may đo').trim(),
      price: row[7],
      total: row[9] || row[7],
      deposit: row[11],
      remaining: row[13],
      tailorCost: row[21],
      fabricCost: row[22],
    });
  }
});

console.log(`\nTổng số dòng hợp lệ có Cột AD-AE: ${validRows.length}`);
console.log('\n--- Danh sách các dòng hợp lệ ---');
console.table(
  validRows.map(r => ({
    'Dòng': r.rowNumber,
    'STT': r.sequence,
    'Ngày đặt (AD)': r.orderDate,
    'Ngày giao (AE)': r.deliveryDate,
    'Khách hàng': r.customerName,
    'SĐT': r.phone,
    'Thành tiền': r.total,
    'Tiền cọc': r.deposit,
  }))
);

// 3. Inspect Drawings and Images
console.log('\n3. Phân tích ảnh trong drawing1.xml...');
const drawingXmlPath = path.join(unpackDir, 'xl', 'drawings', 'drawing1.xml');
const relsXmlPath = path.join(unpackDir, 'xl', 'drawings', '_rels', 'drawing1.xml.rels');

if (fs.existsSync(drawingXmlPath) && fs.existsSync(relsXmlPath)) {
  const drawingXml = fs.readFileSync(drawingXmlPath, 'utf8');
  const relsXml = fs.readFileSync(relsXmlPath, 'utf8');

  const relMap = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="\.\.\/media\/([^"]+)"[^>]*\/>/g)) {
    relMap.set(match[1], match[2]);
  }

  interface ImageAnchor {
    excelRow: number;
    excelCol: number;
    colLetter: string;
    rId: string;
    fileName: string;
    isValidRow: boolean;
  }

  const allImages: ImageAnchor[] = [];

  for (const anchor of drawingXml.matchAll(/<xdr:(?:oneCellAnchor|twoCellAnchor)>[\s\S]*?<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g)) {
    const xml = anchor[0];
    const rowMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
    const colMatch = xml.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/);
    const relMatch = xml.match(/r:embed="([^"]+)"/);

    if (!rowMatch || !colMatch || !relMatch) continue;

    const rowIdx = Number(rowMatch[1]);
    const colIdx = Number(colMatch[1]);
    const excelRow = rowIdx + 1; // 1-indexed
    const rId = relMatch[1];
    const fileName = relMap.get(rId) || '';

    allImages.push({
      excelRow,
      excelCol: colIdx,
      colLetter: XLSX.utils.encode_col(colIdx),
      rId,
      fileName,
      isValidRow: validRowNumbers.has(excelRow),
    });
  }

  console.log(`Tổng số ảnh tìm thấy trong drawing1.xml: ${allImages.length}`);

  const validImages = allImages.filter(img => img.isValidRow);
  const invalidImages = allImages.filter(img => !img.isValidRow);

  console.log(`- Ảnh thuộc các dòng HỢP LỆ (có AD-AE): ${validImages.length}`);
  console.log(`- Ảnh thuộc các dòng BỊ BỎ (không có AD-AE): ${invalidImages.length}`);

  function getAssetType(col: number): string {
    if (col <= 6) return 'PRODUCT';
    if (col <= 12) return 'DEPOSIT_BILL';
    if (col <= 14) return 'BALANCE_BILL';
    return 'FABRIC_BILL';
  }

  const imagesByRow = new Map<number, Array<{ fileName: string; col: number; colLetter: string; type: string }>>();
  validImages.forEach(img => {
    const list = imagesByRow.get(img.excelRow) || [];
    list.push({
      fileName: img.fileName,
      col: img.excelCol,
      colLetter: img.colLetter,
      type: getAssetType(img.excelCol),
    });
    imagesByRow.set(img.excelRow, list);
  });

  console.log('\n--- Thống kê ảnh theo từng dòng hợp lệ ---');
  validRows.forEach(vr => {
    const imgs = imagesByRow.get(vr.rowNumber) || [];
    const breakdown = imgs.reduce((acc, cur) => {
      acc[cur.type] = (acc[cur.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`Dòng ${vr.rowNumber} (STT ${vr.sequence} - ${vr.customerName} - ${vr.orderDate}): Tổng ${imgs.length} ảnh -> ${JSON.stringify(breakdown)}`);
  });
}
