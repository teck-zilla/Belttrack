-- Phase 1 persistence schema: tenant country, per-school idempotency,
-- receipt numbering counters, and a single current inactivity alert per profile.

-- DropIndex
DROP INDEX "Attendance_idempotencyKey_key";

-- DropIndex
DROP INDEX "LedgerEntry_receiptSlug_key";

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "ReceiptCounter" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "discipline" TEXT NOT NULL,
    "last_increment" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptCounter_school_id_idx" ON "ReceiptCounter"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptCounter_school_id_year_discipline_key" ON "ReceiptCounter"("school_id", "year", "discipline");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_school_id_idempotencyKey_key" ON "Attendance"("school_id", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "InactivityAlert_school_id_profileId_key" ON "InactivityAlert"("school_id", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_school_id_receiptSlug_key" ON "LedgerEntry"("school_id", "receiptSlug");

-- AddForeignKey
ALTER TABLE "ReceiptCounter" ADD CONSTRAINT "ReceiptCounter_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-Level Security for the new tenant-scoped table.
ALTER TABLE "ReceiptCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReceiptCounter" FORCE ROW LEVEL SECURITY;

CREATE POLICY receipt_counter_tenant_isolation_policy ON "ReceiptCounter"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));
