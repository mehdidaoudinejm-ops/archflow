-- AlterTable
ALTER TABLE "Lot" ADD COLUMN     "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "lotVatRates" JSONB;
