-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ARCHITECT', 'COLLABORATOR', 'CLIENT', 'COMPANY', 'ADMIN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('SOLO', 'STUDIO', 'AGENCY');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DPGFStatus" AS ENUM ('DRAFT', 'AO_SENT', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AOStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AOCompanyStatus" AS ENUM ('INVITED', 'OPENED', 'IN_PROGRESS', 'SUBMITTED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "AdminDocStatus" AS ENUM ('PENDING', 'VALID', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QAVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "QAStatus" AS ENUM ('PENDING', 'ANSWERED');

-- CreateEnum
CREATE TYPE "AIImportStatus" AS ENUM ('PROCESSING', 'REVIEW', 'IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'SOLO',
    "stripeCustomerId" TEXT,
    "activeModules" TEXT[] DEFAULT ARRAY['dpgf']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "clientUserId" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPermission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,

    CONSTRAINT "ProjectPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DPGF" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "DPGFStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DPGF_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DPGFVersion" (
    "id" TEXT NOT NULL,
    "dpgfId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DPGFVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "dpgfId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubLot" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SubLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "sublotId" TEXT,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "qtyArchi" DOUBLE PRECISION,
    "unitPriceArchi" DOUBLE PRECISION,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "commentArchi" TEXT,
    "libraryRefId" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Library" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "avgPrice" DOUBLE PRECISION,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "trade" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AO" (
    "id" TEXT NOT NULL,
    "dpgfId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lotIds" TEXT[],
    "deadline" TIMESTAMP(3) NOT NULL,
    "instructions" TEXT,
    "status" "AOStatus" NOT NULL DEFAULT 'DRAFT',
    "allowCustomQty" BOOLEAN NOT NULL DEFAULT true,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentAmount" DOUBLE PRECISION,
    "clientPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedElements" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AOCompany" (
    "id" TEXT NOT NULL,
    "aoId" TEXT NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "inviteToken" TEXT,
    "tokenUsedAt" TIMESTAMP(3),
    "status" "AOCompanyStatus" NOT NULL DEFAULT 'INVITED',
    "paymentStatus" TEXT,

    CONSTRAINT "AOCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "aoId" TEXT NOT NULL,
    "aoCompanyId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPost" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "qtyCompany" DOUBLE PRECISION,
    "qtyMotive" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "comment" TEXT,
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "variantDescription" TEXT,

    CONSTRAINT "OfferPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "aoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRead" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "aoCompanyId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminDoc" (
    "id" TEXT NOT NULL,
    "aoCompanyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "AdminDocStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AdminDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QA" (
    "id" TEXT NOT NULL,
    "aoId" TEXT NOT NULL,
    "aoCompanyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "postRef" TEXT,
    "visibility" "QAVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "QAStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAAnswer" (
    "id" TEXT NOT NULL,
    "qaId" TEXT NOT NULL,
    "answeredById" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QAAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIImport" (
    "id" TEXT NOT NULL,
    "dpgfId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "rawResponse" JSONB,
    "confidenceScores" JSONB,
    "status" "AIImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AOCompany_inviteToken_key" ON "AOCompany"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_aoCompanyId_key" ON "Offer"("aoCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRead_documentId_aoCompanyId_key" ON "DocumentRead"("documentId", "aoCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "QAAnswer_qaId_key" ON "QAAnswer"("qaId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPermission" ADD CONSTRAINT "ProjectPermission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPermission" ADD CONSTRAINT "ProjectPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DPGF" ADD CONSTRAINT "DPGF_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DPGFVersion" ADD CONSTRAINT "DPGFVersion_dpgfId_fkey" FOREIGN KEY ("dpgfId") REFERENCES "DPGF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_dpgfId_fkey" FOREIGN KEY ("dpgfId") REFERENCES "DPGF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubLot" ADD CONSTRAINT "SubLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_sublotId_fkey" FOREIGN KEY ("sublotId") REFERENCES "SubLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Library" ADD CONSTRAINT "Library_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AO" ADD CONSTRAINT "AO_dpgfId_fkey" FOREIGN KEY ("dpgfId") REFERENCES "DPGF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AOCompany" ADD CONSTRAINT "AOCompany_aoId_fkey" FOREIGN KEY ("aoId") REFERENCES "AO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_aoCompanyId_fkey" FOREIGN KEY ("aoCompanyId") REFERENCES "AOCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPost" ADD CONSTRAINT "OfferPost_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPost" ADD CONSTRAINT "OfferPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_aoId_fkey" FOREIGN KEY ("aoId") REFERENCES "AO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRead" ADD CONSTRAINT "DocumentRead_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRead" ADD CONSTRAINT "DocumentRead_aoCompanyId_fkey" FOREIGN KEY ("aoCompanyId") REFERENCES "AOCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminDoc" ADD CONSTRAINT "AdminDoc_aoCompanyId_fkey" FOREIGN KEY ("aoCompanyId") REFERENCES "AOCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QA" ADD CONSTRAINT "QA_aoId_fkey" FOREIGN KEY ("aoId") REFERENCES "AO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QA" ADD CONSTRAINT "QA_aoCompanyId_fkey" FOREIGN KEY ("aoCompanyId") REFERENCES "AOCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAAnswer" ADD CONSTRAINT "QAAnswer_qaId_fkey" FOREIGN KEY ("qaId") REFERENCES "QA"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIImport" ADD CONSTRAINT "AIImport_dpgfId_fkey" FOREIGN KEY ("dpgfId") REFERENCES "DPGF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
