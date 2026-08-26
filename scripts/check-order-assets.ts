import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

import { prisma } from '../lib/prisma';

async function main() {
  const count = await prisma.orderAsset.count();
  console.log(`Total OrderAssets in DB: ${count}`);

  const sample = await prisma.orderAsset.findMany({
    take: 5,
    include: {
      order: {
        select: { orderId: true, customerName: true },
      },
    },
  });

  console.log('Sample assets in DB:', JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
