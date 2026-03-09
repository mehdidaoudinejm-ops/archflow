-- Add dpgfId to Document (nullable for backfill)
ALTER TABLE "Document" ADD COLUMN "dpgfId" TEXT;

-- Backfill dpgfId from AO
UPDATE "Document" d
SET "dpgfId" = ao."dpgfId"
FROM "AO" ao
WHERE d."aoId" = ao."id";

-- Make NOT NULL after backfill
ALTER TABLE "Document" ALTER COLUMN "dpgfId" SET NOT NULL;

-- Add FK constraint
ALTER TABLE "Document" ADD CONSTRAINT "Document_dpgfId_fkey"
  FOREIGN KEY ("dpgfId") REFERENCES "DPGF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Make aoId nullable
ALTER TABLE "Document" ALTER COLUMN "aoId" DROP NOT NULL;
