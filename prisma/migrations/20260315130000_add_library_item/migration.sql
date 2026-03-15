-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "lot" TEXT NOT NULL,
    "sousLot" TEXT,
    "intitule" TEXT NOT NULL,
    "unite" TEXT,
    "source" TEXT,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LibraryItem_lot_idx" ON "LibraryItem"("lot");

-- CreateIndex
CREATE INDEX "LibraryItem_validated_idx" ON "LibraryItem"("validated");
