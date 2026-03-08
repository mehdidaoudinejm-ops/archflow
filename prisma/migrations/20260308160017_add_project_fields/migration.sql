-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "projectType" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "surface" DOUBLE PRECISION;
