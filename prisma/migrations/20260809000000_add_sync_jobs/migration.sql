CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "days" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT NOT NULL DEFAULT 'START',
    "cursor" TEXT,
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsSaved" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "messageId" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncJob_groupId_sequence_idx" ON "SyncJob"("groupId", "sequence");
CREATE INDEX "SyncJob_status_createdAt_idx" ON "SyncJob"("status", "createdAt");
