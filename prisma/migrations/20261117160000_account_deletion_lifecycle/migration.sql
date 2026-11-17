-- Account deletion lifecycle: 14-day grace period, staff-approved member
-- deletion requests, owner-initiated school deletion, and purge scheduling.

-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'DELETION_PENDING';

-- CreateEnum
CREATE TYPE "DeletionTargetType" AS ENUM ('USER', 'SCHOOL');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletion_requested_at" TIMESTAMP(3),
ADD COLUMN "deletion_scheduled_for" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "School" ADD COLUMN "deletion_requested_at" TIMESTAMP(3),
ADD COLUMN "deletion_scheduled_for" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeletionRequest" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "target_type" "DeletionTargetType" NOT NULL,
    "target_user_id" TEXT,
    "requested_by_id" TEXT,
    "reviewed_by_id" TEXT,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "decision_note" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "scheduled_for" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_status_deletion_scheduled_for_idx" ON "User"("status", "deletion_scheduled_for");

-- CreateIndex
CREATE INDEX "School_deletion_scheduled_for_idx" ON "School"("deletion_scheduled_for");

-- CreateIndex
CREATE INDEX "DeletionRequest_school_id_status_createdAt_idx" ON "DeletionRequest"("school_id", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DeletionRequest_status_scheduled_for_idx" ON "DeletionRequest"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "DeletionRequest_target_type_target_user_id_idx" ON "DeletionRequest"("target_type", "target_user_id");

-- Row-Level Security for the deletion audit table.
ALTER TABLE "DeletionRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeletionRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY deletion_request_tenant_isolation_policy ON "DeletionRequest"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));
