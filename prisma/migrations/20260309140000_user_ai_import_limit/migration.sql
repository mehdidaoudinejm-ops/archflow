-- Add per-user AI import limit (null = use global default)
ALTER TABLE "User" ADD COLUMN "aiImportLimit" INTEGER;
