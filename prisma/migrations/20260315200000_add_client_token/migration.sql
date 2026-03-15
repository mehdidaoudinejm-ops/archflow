ALTER TABLE "Project" ADD COLUMN "clientToken" TEXT;
CREATE UNIQUE INDEX "Project_clientToken_key" ON "Project"("clientToken");
