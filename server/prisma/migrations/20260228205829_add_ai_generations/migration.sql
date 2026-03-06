-- DropIndex
DROP INDEX "AiGeneration_userId_applicationId_createdAt_idx";

-- CreateIndex
CREATE INDEX "AiGeneration_userId_createdAt_idx" ON "AiGeneration"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGeneration_applicationId_createdAt_idx" ON "AiGeneration"("applicationId", "createdAt");
