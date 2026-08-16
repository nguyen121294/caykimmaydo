import * as dotenv from 'dotenv';
dotenv.config(); // loads .env
dotenv.config({ path: '.env.local', override: true }); // loads .env.local if present

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing connection to Database...');
  
  // 1. Check migrations applied
  try {
    const migrations: any = await prisma.$queryRaw`
      SELECT id, migration_name, finished_at, rolled_back_at 
      FROM _prisma_migrations 
      ORDER BY finished_at ASC;
    `;
    console.log('\n=== Applied Migrations in Database ===');
    console.table(migrations);
  } catch (err: any) {
    console.error('Error fetching migrations:', err.message);
  }

  // 2. Check Customer table columns
  try {
    const columns: any = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Customer'
      ORDER BY ordinal_position;
    `;
    console.log('\n=== Columns in Customer Table ===');
    console.table(columns);
  } catch (err: any) {
    console.error('Error checking Customer columns:', err.message);
  }

  // 3. Check row counts for key tables
  try {
    const userCount = await prisma.user.count();
    const customerCount = await prisma.customer.count();
    const orderCount = await prisma.order.count();
    const financeLedgerCount = await prisma.financeLedger.count();
    const syncJobCount = await prisma.syncJob.count();
    const fbCount = await prisma.facebookPost.count();
    const igCount = await prisma.instagramPost.count();

    console.log('\n=== Table Counts ===');
    console.table({
      User: userCount,
      Customer: customerCount,
      Order: orderCount,
      FinanceLedger: financeLedgerCount,
      SyncJob: syncJobCount,
      FacebookPost: fbCount,
      InstagramPost: igCount,
    });
  } catch (err: any) {
    console.error('Error counting rows:', err.message);
  }

  // 4. Check Customer normalizedPhone status (if any are unnormalized)
  try {
    const totalCustomers = await prisma.customer.count();
    const customersWithNormalizedPhone = await prisma.customer.count({
      where: { normalizedPhone: { not: null } }
    });
    const customersWithPhoneOnly = await prisma.customer.count({
      where: { phone: { not: null }, normalizedPhone: null }
    });
    console.log('\n=== Customer Phone Normalization Status ===');
    console.log(`Total Customers: ${totalCustomers}`);
    console.log(`With normalizedPhone: ${customersWithNormalizedPhone}`);
    console.log(`With phone but NO normalizedPhone: ${customersWithPhoneOnly}`);
  } catch (err: any) {
    console.error('Error checking phone normalization:', err.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
