import * as path from 'node:path';
import * as XLSX from 'xlsx';

const filePath = path.resolve('docs', 'caykimmaydo báo cáo thu chi 2026_edit_2608_cut.xlsx');
const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });

console.log('=== Danh sách Sheet trong file ===');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });
  
  console.log(`\n--- Sheet: ${sheetName} (Tổng số dòng: ${rows.length}) ---`);
  
  // In 5 dòng đầu tiên để xem cấu trúc header
  console.log('Header / 3 dòng đầu:');
  rows.slice(0, 3).forEach((r, idx) => console.log(`  Row ${idx + 1}:`, r.slice(0, 20).map(c => String(c).trim()).filter(Boolean)));

  // Tìm các dòng liên quan tới 21/8 hoặc 7.620.000 hoặc 7620000
  rows.forEach((row, rIdx) => {
    const rowStr = JSON.stringify(row);
    if (
      rowStr.includes('7620000') ||
      rowStr.includes('7.620.000') ||
      rowStr.includes('7,620,000') ||
      rowStr.includes('21/8') ||
      rowStr.includes('21/08') ||
      rowStr.includes('46255') || // serial number for 2026-08-21 in excel (approx)
      rowStr.includes('46256')
    ) {
      console.log(`\n  👉 [Found match at Row ${rIdx + 1}]:`);
      row.forEach((val, cIdx) => {
        if (val !== '' && val !== null && val !== undefined) {
          const colLetter = XLSX.utils.encode_col(cIdx);
          console.log(`     Col ${colLetter} (col ${cIdx}): ${val}`);
        }
      });
    }
  });
}
