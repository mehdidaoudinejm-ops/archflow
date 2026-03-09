-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AOStatus" ADD VALUE 'ANALYSED';
ALTER TYPE "AOStatus" ADD VALUE 'AWARDED';

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20;
