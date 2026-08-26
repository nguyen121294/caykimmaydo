-- Additive migration: link Orders to CRM, record operational ownership and costs,
-- and support separate product/payment/fabric image records.
CREATE TYPE "OrderAssetType" AS ENUM ('PRODUCT', 'DEPOSIT_BILL', 'BALANCE_BILL', 'FABRIC_BILL');

ALTER TABLE "Order"
  ADD COLUMN "customerId" TEXT,
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "listPrice" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "discountAmount" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "paymentAccount" TEXT,
  ADD COLUMN "tailorCost" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "fabricCost" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "shippingFee" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "needsCustomerPhone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "importBatchId" TEXT,
  ADD COLUMN "salesOwnerId" TEXT,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT;

CREATE TABLE "OrderAsset" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "OrderAssetType" NOT NULL,
  "url" TEXT NOT NULL,
  "storagePath" TEXT,
  "fileName" TEXT,
  "mimeType" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_salesOwnerId_idx" ON "Order"("salesOwnerId");
CREATE INDEX "Order_needsCustomerPhone_idx" ON "Order"("needsCustomerPhone");
CREATE INDEX "Order_importBatchId_idx" ON "Order"("importBatchId");
CREATE INDEX "OrderAsset_orderId_type_idx" ON "OrderAsset"("orderId", "type");

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_salesOwnerId_fkey" FOREIGN KEY ("salesOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderAsset" ADD CONSTRAINT "OrderAsset_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderAsset" ADD CONSTRAINT "OrderAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
