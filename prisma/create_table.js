const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating FacebookPost table if not exists...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FacebookPost" (
      "id" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "pageId" TEXT,
      "pageName" TEXT,
      "message" TEXT,
      "picture" TEXT,
      "permalinkUrl" TEXT,
      "createdTime" TIMESTAMP(3),
      "likesCount" INTEGER NOT NULL DEFAULT 0,
      "viewsCount" INTEGER NOT NULL DEFAULT 0,
      "commentsCount" INTEGER NOT NULL DEFAULT 0,
      "sharesCount" INTEGER NOT NULL DEFAULT 0,
      "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FacebookPost_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "FacebookPost_postId_key" ON "FacebookPost"("postId");
  `);

  console.log('Successfully created FacebookPost table!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
