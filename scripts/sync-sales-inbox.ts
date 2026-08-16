import { prisma } from '../lib/prisma';
import { syncSalesInboxToDatabase } from '../lib/sales-inbox';

async function main() {
  const result = await syncSalesInboxToDatabase();
  console.log(JSON.stringify({
    conversations: result.conversations.length,
    platforms: result.platforms.map((platform) => ({
      platform: platform.platform,
      state: platform.state,
      conversationCount: platform.conversationCount,
    })),
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Inbox sync failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
