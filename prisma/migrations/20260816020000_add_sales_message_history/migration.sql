CREATE TABLE "SalesConversation" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerExternalId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "senderExternalId" TEXT,
    "senderName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hasAttachment" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesInboxSyncState" (
    "platform" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "detail" TEXT,
    "conversationCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesInboxSyncState_pkey" PRIMARY KEY ("platform")
);

CREATE UNIQUE INDEX "SalesConversation_platform_externalId_key"
ON "SalesConversation"("platform", "externalId");

CREATE INDEX "SalesConversation_platform_lastMessageAt_idx"
ON "SalesConversation"("platform", "lastMessageAt");

CREATE INDEX "SalesConversation_lastMessageAt_idx"
ON "SalesConversation"("lastMessageAt");

CREATE UNIQUE INDEX "SalesMessage_conversationId_externalId_key"
ON "SalesMessage"("conversationId", "externalId");

CREATE INDEX "SalesMessage_conversationId_sentAt_idx"
ON "SalesMessage"("conversationId", "sentAt");

ALTER TABLE "SalesMessage"
ADD CONSTRAINT "SalesMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "SalesConversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
