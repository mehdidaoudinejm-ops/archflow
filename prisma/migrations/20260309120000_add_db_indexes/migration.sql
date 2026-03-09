-- Add indexes on foreign key columns for query performance

CREATE INDEX IF NOT EXISTS "User_agencyId_idx" ON "User"("agencyId");

CREATE INDEX IF NOT EXISTS "Project_agencyId_idx" ON "Project"("agencyId");

CREATE INDEX IF NOT EXISTS "Contact_agencyId_idx" ON "Contact"("agencyId");

CREATE INDEX IF NOT EXISTS "ProjectPermission_projectId_idx" ON "ProjectPermission"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectPermission_userId_idx" ON "ProjectPermission"("userId");

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_projectId_idx" ON "ActivityLog"("projectId");

CREATE INDEX IF NOT EXISTS "DPGF_projectId_idx" ON "DPGF"("projectId");

CREATE INDEX IF NOT EXISTS "DPGFVersion_dpgfId_idx" ON "DPGFVersion"("dpgfId");

CREATE INDEX IF NOT EXISTS "Lot_dpgfId_idx" ON "Lot"("dpgfId");

CREATE INDEX IF NOT EXISTS "SubLot_lotId_idx" ON "SubLot"("lotId");

CREATE INDEX IF NOT EXISTS "Post_lotId_idx" ON "Post"("lotId");
CREATE INDEX IF NOT EXISTS "Post_sublotId_idx" ON "Post"("sublotId");

CREATE INDEX IF NOT EXISTS "Library_agencyId_idx" ON "Library"("agencyId");

CREATE INDEX IF NOT EXISTS "AO_dpgfId_idx" ON "AO"("dpgfId");

CREATE INDEX IF NOT EXISTS "AOCompany_aoId_idx" ON "AOCompany"("aoId");
CREATE INDEX IF NOT EXISTS "AOCompany_companyUserId_idx" ON "AOCompany"("companyUserId");

CREATE INDEX IF NOT EXISTS "Offer_aoId_idx" ON "Offer"("aoId");

CREATE INDEX IF NOT EXISTS "OfferPost_offerId_idx" ON "OfferPost"("offerId");
CREATE INDEX IF NOT EXISTS "OfferPost_postId_idx" ON "OfferPost"("postId");

CREATE INDEX IF NOT EXISTS "Document_dpgfId_idx" ON "Document"("dpgfId");
CREATE INDEX IF NOT EXISTS "Document_aoId_idx" ON "Document"("aoId");

CREATE INDEX IF NOT EXISTS "AdminDoc_aoCompanyId_idx" ON "AdminDoc"("aoCompanyId");

CREATE INDEX IF NOT EXISTS "QA_aoId_idx" ON "QA"("aoId");
CREATE INDEX IF NOT EXISTS "QA_aoCompanyId_idx" ON "QA"("aoCompanyId");

CREATE INDEX IF NOT EXISTS "AIImport_dpgfId_idx" ON "AIImport"("dpgfId");
