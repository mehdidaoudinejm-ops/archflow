-- AlterTable
ALTER TABLE "LibraryItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "AO_dpgfId_status_idx" ON "AO"("dpgfId", "status");

-- CreateIndex
CREATE INDEX "AOCompany_aoId_status_idx" ON "AOCompany"("aoId", "status");

-- CreateIndex
CREATE INDEX "Lot_dpgfId_position_idx" ON "Lot"("dpgfId", "position");

-- CreateIndex
CREATE INDEX "Post_lotId_position_idx" ON "Post"("lotId", "position");

-- CreateIndex
CREATE INDEX "Post_sublotId_position_idx" ON "Post"("sublotId", "position");
