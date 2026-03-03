-- AlterTable
ALTER TABLE "AO" ADD COLUMN     "requiredDocs" JSONB;

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "city" TEXT,
ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "legalForm" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "siretVerified" BOOLEAN NOT NULL DEFAULT false;
