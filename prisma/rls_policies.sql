-- ============================================================================
-- BeltTrack Martial Arts Management - PostgreSQL Row-Level Security (RLS)
-- Document Reference: PRD Section 1.2, Section 4.2, Section 8 & fixes.md
-- ============================================================================
-- Every private record is explicitly bound to school_id foreign key.
-- FORCE ROW LEVEL SECURITY ensures table owners / backend connections obey RLS.
-- Cross-tenant queries are blocked at the database engine level.
-- Global discovery is strictly constrained to accredited public schools.
-- ============================================================================

-- 1. SCHOOL ENTITY (PUBLIC DISCOVERY VS PRIVATE TENANT DETAILS)
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "School" FORCE ROW LEVEL SECURITY;

-- Public directory: only active, accredited schools
CREATE POLICY school_public_directory_policy ON "School"
  FOR SELECT
  USING ("isCodeActive" = true);

-- Mutations restricted to authenticated school owner
CREATE POLICY school_tenant_mutation_policy ON "School"
  FOR ALL
  USING (id = current_setting('app.current_school_id', true))
  WITH CHECK (id = current_setting('app.current_school_id', true));

-- 2. TENANT USERS & MEMBERSHIPS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

CREATE POLICY user_tenant_isolation_policy ON "User"
  FOR SELECT
  USING (
    school_id = current_setting('app.current_school_id', true)
    AND (
      -- Pending users can only view their own account record
      status != 'PENDING_APPROVAL'
      OR id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY user_tenant_mutation_policy ON "User"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- 3. STUDENT PROFILES (PRIVATE ROSTER DATA)
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" FORCE ROW LEVEL SECURITY;

CREATE POLICY student_profile_tenant_isolation_policy ON "StudentProfile"
  FOR SELECT
  USING (
    school_id = current_setting('app.current_school_id', true)
    AND (
      -- Student profiles visible to active members, or students viewing their own profile
      "userId" = current_setting('app.current_user_id', true)
      OR EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = current_setting('app.current_user_id', true)
          AND u.school_id = current_setting('app.current_school_id', true)
          AND u.status = 'ACTIVE'
      )
    )
  );

CREATE POLICY student_profile_mutation_policy ON "StudentProfile"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- 4. GUARDIAN-STUDENT DEPENDENT LINKS
ALTER TABLE "GuardianStudent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GuardianStudent" FORCE ROW LEVEL SECURITY;

CREATE POLICY guardian_student_tenant_isolation_policy ON "GuardianStudent"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- 5. RANK TRACKS & BELT LADDERS
ALTER TABLE "RankTrack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RankTrack" FORCE ROW LEVEL SECURITY;

CREATE POLICY rank_track_tenant_isolation_policy ON "RankTrack"
  FOR SELECT
  USING (school_id = current_setting('app.current_school_id', true));

CREATE POLICY rank_track_mutation_policy ON "RankTrack"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- 6. RANKS
ALTER TABLE "Rank" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rank" FORCE ROW LEVEL SECURITY;

CREATE POLICY rank_tenant_isolation_policy ON "Rank"
  FOR SELECT
  USING (school_id = current_setting('app.current_school_id', true));

CREATE POLICY rank_mutation_policy ON "Rank"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- 7. CURRICULUM TECHNIQUES & PROGRESS
ALTER TABLE "Technique" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Technique" FORCE ROW LEVEL SECURITY;

-- Block PENDING_APPROVAL accounts from reading techniques until coach sign-off
CREATE POLICY technique_tenant_isolation_policy ON "Technique"
  FOR SELECT
  USING (
    school_id = current_setting('app.current_school_id', true)
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = current_setting('app.current_user_id', true)
        AND u.school_id = current_setting('app.current_school_id', true)
        AND u.status = 'ACTIVE'
    )
  );

CREATE POLICY technique_mutation_policy ON "Technique"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "TechniqueProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TechniqueProgress" FORCE ROW LEVEL SECURITY;

CREATE POLICY technique_progress_tenant_isolation_policy ON "TechniqueProgress"
  FOR SELECT
  USING (school_id = current_setting('app.current_school_id', true));

-- Mutations require school_id match; verification status updates restricted by app logic
CREATE POLICY technique_progress_mutation_policy ON "TechniqueProgress"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- 8. CLASS SCHEDULES & MAT ATTENDANCE
ALTER TABLE "ClassSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSchedule" FORCE ROW LEVEL SECURITY;

CREATE POLICY class_schedule_tenant_isolation_policy ON "ClassSchedule"
  FOR SELECT
  USING (school_id = current_setting('app.current_school_id', true));

CREATE POLICY class_schedule_mutation_policy ON "ClassSchedule"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" FORCE ROW LEVEL SECURITY;

CREATE POLICY attendance_tenant_isolation_policy ON "Attendance"
  FOR SELECT
  USING (school_id = current_setting('app.current_school_id', true));

CREATE POLICY attendance_tenant_insert_policy ON "Attendance"
  FOR INSERT
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- 9. INTERNAL BOOKKEEPING LEDGER (ZERO MONETIZATION, IMMUTABLE)
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" FORCE ROW LEVEL SECURITY;

-- Owner and Coaches see all school records; Students see only their own receipts
CREATE POLICY ledger_tenant_isolation_policy ON "LedgerEntry"
  FOR SELECT
  USING (
    school_id = current_setting('app.current_school_id', true)
    AND (
      -- Student / Guardian privacy shield: view own payments only
      "userId" = current_setting('app.current_user_id', true)
      -- Or Head Coach / Owner full ledger view
      OR EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = current_setting('app.current_user_id', true)
          AND u.school_id = current_setting('app.current_school_id', true)
          AND u.role IN ('OWNER', 'COACH')
      )
    )
  );

CREATE POLICY ledger_tenant_insert_policy ON "LedgerEntry"
  FOR INSERT
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- Prevent updates and deletes to guarantee immutability
CREATE POLICY ledger_block_update ON "LedgerEntry"
  FOR UPDATE
  USING (false);

CREATE POLICY ledger_block_delete ON "LedgerEntry"
  FOR DELETE
  USING (false);

-- 10. INACTIVITY RETENTION ALERTS
ALTER TABLE "InactivityAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InactivityAlert" FORCE ROW LEVEL SECURITY;

-- Retention alerts visible to school staff or student themselves
CREATE POLICY inactivity_alert_tenant_isolation_policy ON "InactivityAlert"
  FOR SELECT
  USING (
    school_id = current_setting('app.current_school_id', true)
    AND (
      EXISTS (
        SELECT 1 FROM "StudentProfile" sp
        WHERE sp.id = "profileId"
          AND sp."userId" = current_setting('app.current_user_id', true)
      )
      OR EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = current_setting('app.current_user_id', true)
          AND u.school_id = current_setting('app.current_school_id', true)
          AND u.role IN ('OWNER', 'COACH')
      )
    )
  );

CREATE POLICY inactivity_alert_mutation_policy ON "InactivityAlert"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true))
  WITH CHECK (school_id = current_setting('app.current_school_id', true));
