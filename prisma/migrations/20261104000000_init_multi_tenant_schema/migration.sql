-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'COACH', 'STUDENT', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MANUAL_CARD');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TUITION', 'TESTING_FEE', 'UNIFORM_EQUIPMENT', 'CORRECTION_REVERSAL');

-- CreateEnum
CREATE TYPE "TechniqueStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'VERIFIED');

-- CreateTable "School"
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "joinCode" TEXT NOT NULL,
    "isCodeActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable "User"
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabase_uid" TEXT,
    "school_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable "StudentProfile"
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "currentRankId" TEXT,
    "lastPromotionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable "GuardianStudent"
CREATE TABLE "GuardianStudent" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable "RankTrack"
CREATE TABLE "RankTrack" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "RankTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable "Rank"
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "rankTrackId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "beltColorHex" TEXT NOT NULL,
    "requiredClasses" INTEGER NOT NULL,
    "requiredActiveDays" INTEGER NOT NULL,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable "Technique"
CREATE TABLE "Technique" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "rankId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Technique_pkey" PRIMARY KEY ("id")
);

-- CreateTable "TechniqueProgress"
CREATE TABLE "TechniqueProgress" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "techniqueId" TEXT NOT NULL,
    "status" "TechniqueStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "TechniqueProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable "ClassSchedule"
CREATE TABLE "ClassSchedule" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "ClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable "Attendance"
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "classId" TEXT,
    "attendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable "LedgerEntry"
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receiptSlug" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "reversalRefSlug" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable "InactivityAlert"
CREATE TABLE "InactivityAlert" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "daysInactive" INTEGER NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InactivityAlert_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");
CREATE UNIQUE INDEX "School_joinCode_key" ON "School"("joinCode");
CREATE INDEX "School_joinCode_idx" ON "School"("joinCode");
CREATE INDEX "School_slug_city_idx" ON "School"("slug", "city");

CREATE UNIQUE INDEX "User_supabase_uid_key" ON "User"("supabase_uid");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_school_id_role_idx" ON "User"("school_id", "role");
CREATE INDEX "User_school_id_status_idx" ON "User"("school_id", "status");

CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE INDEX "StudentProfile_school_id_idx" ON "StudentProfile"("school_id");

CREATE UNIQUE INDEX "GuardianStudent_guardianId_studentId_key" ON "GuardianStudent"("guardianId", "studentId");
CREATE INDEX "GuardianStudent_school_id_idx" ON "GuardianStudent"("school_id");

CREATE INDEX "RankTrack_school_id_idx" ON "RankTrack"("school_id");

CREATE UNIQUE INDEX "Rank_rankTrackId_orderIndex_key" ON "Rank"("rankTrackId", "orderIndex");
CREATE INDEX "Rank_school_id_idx" ON "Rank"("school_id");

CREATE INDEX "Technique_school_id_idx" ON "Technique"("school_id");

CREATE UNIQUE INDEX "TechniqueProgress_profileId_techniqueId_key" ON "TechniqueProgress"("profileId", "techniqueId");
CREATE INDEX "TechniqueProgress_school_id_idx" ON "TechniqueProgress"("school_id");

CREATE INDEX "ClassSchedule_school_id_idx" ON "ClassSchedule"("school_id");

CREATE UNIQUE INDEX "Attendance_idempotencyKey_key" ON "Attendance"("idempotencyKey");
CREATE INDEX "Attendance_school_id_idx" ON "Attendance"("school_id");
CREATE INDEX "Attendance_profileId_attendedAt_idx" ON "Attendance"("profileId", "attendedAt");

CREATE UNIQUE INDEX "LedgerEntry_receiptSlug_key" ON "LedgerEntry"("receiptSlug");
CREATE INDEX "LedgerEntry_school_id_userId_idx" ON "LedgerEntry"("school_id", "userId");
CREATE INDEX "LedgerEntry_receiptSlug_idx" ON "LedgerEntry"("receiptSlug");

CREATE INDEX "InactivityAlert_school_id_isResolved_idx" ON "InactivityAlert"("school_id", "isResolved");

-- Foreign Keys
ALTER TABLE "User" ADD CONSTRAINT "User_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_currentRankId_fkey" FOREIGN KEY ("currentRankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuardianStudent" ADD CONSTRAINT "GuardianStudent_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuardianStudent" ADD CONSTRAINT "GuardianStudent_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuardianStudent" ADD CONSTRAINT "GuardianStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RankTrack" ADD CONSTRAINT "RankTrack_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rank" ADD CONSTRAINT "Rank_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rank" ADD CONSTRAINT "Rank_rankTrackId_fkey" FOREIGN KEY ("rankTrackId") REFERENCES "RankTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Technique" ADD CONSTRAINT "Technique_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Technique" ADD CONSTRAINT "Technique_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechniqueProgress" ADD CONSTRAINT "TechniqueProgress_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechniqueProgress" ADD CONSTRAINT "TechniqueProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TechniqueProgress" ADD CONSTRAINT "TechniqueProgress_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "Technique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSchedule" ADD CONSTRAINT "ClassSchedule_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InactivityAlert" ADD CONSTRAINT "InactivityAlert_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
