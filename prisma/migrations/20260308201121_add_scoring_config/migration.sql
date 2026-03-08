-- CreateTable
CREATE TABLE "AOScoringConfig" (
    "id" TEXT NOT NULL,
    "aoId" TEXT NOT NULL,
    "weightPrice" INTEGER NOT NULL DEFAULT 30,
    "weightDocuments" INTEGER NOT NULL DEFAULT 25,
    "weightReliability" INTEGER NOT NULL DEFAULT 20,
    "weightDivergences" INTEGER NOT NULL DEFAULT 15,
    "weightReactivity" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AOScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AOScoringConfig_aoId_key" ON "AOScoringConfig"("aoId");

-- AddForeignKey
ALTER TABLE "AOScoringConfig" ADD CONSTRAINT "AOScoringConfig_aoId_fkey" FOREIGN KEY ("aoId") REFERENCES "AO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
