-- AlterTable
ALTER TABLE "AOCompany" ADD COLUMN     "selectedLotIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
