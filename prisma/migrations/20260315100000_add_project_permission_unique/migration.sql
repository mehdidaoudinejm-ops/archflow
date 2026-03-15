-- AddUniqueConstraint on ProjectPermission(projectId, userId, module)
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectPermission_projectId_userId_module_key" ON "ProjectPermission"("projectId", "userId", "module");
