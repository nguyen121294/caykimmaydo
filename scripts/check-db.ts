import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from './lib/prisma';

async function checkDB() {
  const creds = await prisma.platformCredential.findMany({
    select: {
      platform: true,
      isConnected: true,
      lastTested: true,
      updatedAt: true
    }
  });
  console.log('Current Platform Credentials in DB:');
  console.table(creds);
}
checkDB().finally(() => prisma.$disconnect());
