-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Application_userId_stage_position_idx" ON "Application"("userId", "stage", "position");
