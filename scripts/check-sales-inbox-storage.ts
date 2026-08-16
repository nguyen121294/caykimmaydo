import { prisma } from '../lib/prisma';

async function main() {
  const [conversations, messages, syncStates] = await Promise.all([
    prisma.salesConversation.count(),
    prisma.salesMessage.count(),
    prisma.salesInboxSyncState.count(),
  ]);
  console.log(JSON.stringify({ ok: true, conversations, messages, syncStates }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Database check failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
