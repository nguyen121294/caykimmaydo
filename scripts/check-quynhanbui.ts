import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { prisma } from '../lib/prisma';
import * as XLSX from 'xlsx';

async function main() {
  // 1. Check in Database
  const orders = await prisma.order.findMany({
    where: { customerName: 'quynhanbui__' },
    select: {
      id: true,
      orderId: true,
      customerName: true,
      phone: true,
      customerId: true,
      needsCustomerPhone: true,
      total: true,
      deposit: true,
    },
  });

  const customerInCrm = await prisma.customer.findFirst({
    where: {
      OR: [
        { name: 'quynhanbui__' },
        { phone: 'quynhanbui__' },
      ],
    },
  });

  console.log('=== Database Status for quynhanbui__ ===');
  console.log(`- Số đơn hàng trong bảng Order: ${orders.length}`);
  console.log('Chi tiết đơn:', orders);
  console.log('- Hồ sơ trong bảng Customer (CRM):', customerInCrm);

  // 2. Check all orders needing phone in DB
  const missingPhoneOrders = await prisma.order.findMany({
    where: { needsCustomerPhone: true },
    select: { orderId: true, customerName: true, phone: true },
  });
  console.log(`\n- Tổng số đơn hàng có cờ needsCustomerPhone: true trong DB: ${missingPhoneOrders.length}`);
  console.log(missingPhoneOrders);

  // 3. Check in Excel file
  const wb = XLSX.readFile('docs/edit_ckmd.xlsx', { raw: true });
  const sheet = wb.Sheets['QUẢN LÍ ĐƠN HÀNG'];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });

  console.log('\n=== Dữ liệu gốc trong file Excel (edit_ckmd.xlsx) cho quynhanbui__ ===');
  rows.forEach((r, idx) => {
    if (String(r[3]).includes('quynhanbui')) {
      console.log(`Dòng Excel ${idx + 1}:`);
      console.log(`  - Tên (Cột D): "${r[3]}"`);
      console.log(`  - SĐT (Cột E): "${r[4]}" (Rỗng: ${r[4] === '' || r[4] === null})`);
      console.log(`  - Ngày đặt (Cột AD): "${r[29]}"`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
