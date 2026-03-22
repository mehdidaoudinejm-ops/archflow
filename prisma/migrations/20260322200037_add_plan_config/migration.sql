-- CreateTable
CREATE TABLE "PlanConfig" (
    "plan" TEXT NOT NULL,
    "collaboratorLimit" INTEGER NOT NULL DEFAULT 0,
    "aiImportLimit" INTEGER NOT NULL DEFAULT 3,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "features" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("plan")
);
