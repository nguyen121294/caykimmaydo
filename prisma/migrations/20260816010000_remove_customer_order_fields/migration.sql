-- Release order:
-- 1. Deploy application code that no longer reads or writes these columns.
-- 2. Run this migration manually after the new application is healthy.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Customer"
    WHERE "tailoringNeed" IS NOT NULL
       OR "measurementInfo" IS NOT NULL
       OR "noteInfo" IS NOT NULL
       OR "completedDate" IS NOT NULL
       OR "inactiveDays" <> 0
  ) THEN
    RAISE EXCEPTION 'Customer order-domain columns contain data; aborting destructive migration';
  END IF;
END $$;

ALTER TABLE "Customer"
  DROP COLUMN "tailoringNeed",
  DROP COLUMN "measurementInfo",
  DROP COLUMN "noteInfo",
  DROP COLUMN "completedDate",
  DROP COLUMN "inactiveDays";
