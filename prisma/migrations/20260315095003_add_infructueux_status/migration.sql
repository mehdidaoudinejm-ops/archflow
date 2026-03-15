-- AlterEnum
ALTER TYPE "AOStatus" ADD VALUE 'INFRUCTUEUX';

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_aoId_fkey";

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_aoId_fkey" FOREIGN KEY ("aoId") REFERENCES "AO"("id") ON DELETE SET NULL ON UPDATE CASCADE;
