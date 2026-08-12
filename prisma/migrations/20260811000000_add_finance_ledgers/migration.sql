CREATE TABLE "FinanceLedger" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceLedgerRow" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DETAIL',
    "sortOrder" INTEGER NOT NULL,
    "values" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceLedgerRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceMonthStatus" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceMonthStatus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceAuditLog" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "rowId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceLedger_year_key" ON "FinanceLedger"("year");
CREATE INDEX "FinanceLedgerRow_ledgerId_sortOrder_idx" ON "FinanceLedgerRow"("ledgerId", "sortOrder");
CREATE INDEX "FinanceLedgerRow_parentId_idx" ON "FinanceLedgerRow"("parentId");
CREATE UNIQUE INDEX "FinanceMonthStatus_ledgerId_month_key" ON "FinanceMonthStatus"("ledgerId", "month");
CREATE INDEX "FinanceAuditLog_ledgerId_createdAt_idx" ON "FinanceAuditLog"("ledgerId", "createdAt");
CREATE INDEX "FinanceAuditLog_rowId_idx" ON "FinanceAuditLog"("rowId");
CREATE INDEX "FinanceAuditLog_userId_idx" ON "FinanceAuditLog"("userId");

ALTER TABLE "FinanceLedgerRow" ADD CONSTRAINT "FinanceLedgerRow_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "FinanceLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceLedgerRow" ADD CONSTRAINT "FinanceLedgerRow_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinanceLedgerRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceMonthStatus" ADD CONSTRAINT "FinanceMonthStatus_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "FinanceLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAuditLog" ADD CONSTRAINT "FinanceAuditLog_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "FinanceLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceAuditLog" ADD CONSTRAINT "FinanceAuditLog_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "FinanceLedgerRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceAuditLog" ADD CONSTRAINT "FinanceAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
