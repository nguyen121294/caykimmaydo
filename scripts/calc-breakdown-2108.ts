import * as path from 'node:path';
import * as XLSX from 'xlsx';

const filePath = path.resolve('docs', 'caykimmaydo báo cáo thu chi 2026_edit_2608_cut.xlsx');
const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
const sheet = workbook.Sheets['QUẢN LÍ ĐƠN HÀNG'];
const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });

const header = rows[0];

console.log('=== CHI TIẾT CÁC ĐƠN HÀNG NGÀY 21/08/2026 (Rows 26 - 31) ===\n');

let sumTotal = 0;
let sumDeposit = 0;
let sumRemaining = 0;
let sumTailor = 0;
let sumFabric = 0;
let sumProfit = 0;

for (let r = 25; r <= 30; r++) {
  const row = rows[r];
  const orderNum = row[0];
  const orderDateSerial = row[1];
  const deliveryDateSerial = row[2];
  const customerName = row[3];
  const price = Number(row[7]) || 0;
  const total = Number(row[9]) || 0;
  const deposit = Number(row[11]) || 0;
  const remaining = Number(row[13]) || 0;
  const tailorCost = Number(row[21]) || 0;
  const fabricCost = Number(row[22]) || 0;
  const profit = Number(row[24]) || 0;

  sumTotal += total;
  sumDeposit += deposit;
  sumRemaining += remaining;
  sumTailor += tailorCost;
  sumFabric += fabricCost;
  sumProfit += profit;

  console.log(`Dòng Excel ${r + 1} (STT ${orderNum}):`);
  console.log(`  - Khách hàng: ${customerName}`);
  console.log(`  - Ngày đặt (Col B): ${orderDateSerial} (21/08/2026)`);
  console.log(`  - Ngày giao (Col C): ${deliveryDateSerial} (03/09/2026)`);
  console.log(`  - Giá niêm yết (Col H): ${price.toLocaleString('vi-VN')} đ`);
  console.log(`  - Thành tiền (Col J): ${total.toLocaleString('vi-VN')} đ`);
  console.log(`  - Tiền cọc (Col L): ${deposit.toLocaleString('vi-VN')} đ`);
  console.log(`  - Còn thiếu (Col N): ${remaining.toLocaleString('vi-VN')} đ`);
  console.log(`  - Công thợ (Col V): ${tailorCost.toLocaleString('vi-VN')} đ`);
  console.log(`  - Tiền vải (Col W): ${fabricCost.toLocaleString('vi-VN')} đ`);
  console.log(`  - Lợi nhuận (Col Y): ${profit.toLocaleString('vi-VN')} đ\n`);
}

console.log('=== TỔNG CỘNG NGÀY 21/08/2026 (6 đơn) ===');
console.log(`- Tổng Thành tiền (Doanh thu đơn đặt): ${sumTotal.toLocaleString('vi-VN')} đ`);
console.log(`- Tổng Tiền cọc: ${sumDeposit.toLocaleString('vi-VN')} đ`);
console.log(`- Tổng Tiền còn thiếu: ${sumRemaining.toLocaleString('vi-VN')} đ`);
console.log(`- Tổng Công thợ: ${sumTailor.toLocaleString('vi-VN')} đ`);
console.log(`- Tổng Tiền vải: ${sumFabric.toLocaleString('vi-VN')} đ`);
console.log(`- Tổng Lợi nhuận gộp: ${sumProfit.toLocaleString('vi-VN')} đ`);
