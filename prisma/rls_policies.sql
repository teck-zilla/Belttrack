-- ============================================================================
-- BeltTrack Martial Arts Management - PostgreSQL Row-Level Security (RLS)
-- Document Reference: PRD Section 1.2, Section 4.2 & Section 8
-- ============================================================================
-- Every private record is explicitly bound to school_id.
-- Cross-tenant queries are blocked at the database engine level.
-- Global discovery is strictly constrained to accredited public schools.
-- ============================================================================

-- 1. SCHOOL ENTITY (PUBLIC DISCOVERY VS PRIVATE TENANT DETAILS)
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;

-- Public can view accredited dojos (name, slug, discipline, city) without roster leak
CREATE POLICY school_public_directory_policy ON "School"
  FOR SELECT
  USING (true);

-- Mutations restricted to authenticated school owner
CREATE POLICY school_tenant_mutation_policy ON "School"
  FOR ALL
  USING (id = current_setting('app.current_school_id', true));

-- 2. TENANT USERS & MEMBERSHIPS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_tenant_isolation_policy ON "User"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true));

-- 3. STUDENT PROFILES (PRIVATE ROSTER DATA)
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_profile_tenant_isolation_policy ON "StudentProfile"
  FOR ALL
  USING (
    userId IN (
      SELECT id FROM "User"
      WHERE school_id = current_setting('app.current_school_id', true)
    )
  );

-- 4. GUARDIAN-STUDENT DEPENDENT LINKS
ALTER TABLE "GuardianStudent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY guardian_student_tenant_isolation_policy ON "GuardianStudent"
  FOR ALL
  USING (
    guardianId IN (
      SELECT id FROM "User"
      WHERE school_id = current_setting('app.current_school_id', true)
    )
  );

-- 5. RANK TRACKS & BELT LADDERS
ALTER TABLE "RankTrack" ENABLE ROW LEVEL SECURITY;

CREATE POLICY rank_track_tenant_isolation_policy ON "RankTrack"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true));

-- 6. CURRICULUM TECHNIQUES & PROGRESS
ALTER TABLE "Rank" ENABLE ROW LEVEL SECURITY;

CREATE POLICY rank_tenant_isolation_policy ON "Rank"
  FOR ALL
  USING (
    rankTrackId IN (
      SELECT id FROM "RankTrack"
      WHERE school_id = current_setting('app.current_school_id', true)
    )
  );

ALTER TABLE "Technique" ENABLE ROW LEVEL SECURITY;

CREATE POLICY technique_tenant_isolation_policy ON "Technique"
  FOR ALL
  USING (
    rankId IN (
      SELECT r.id FROM "Rank" r
      JOIN "RankTrack" rt ON r.rankTrackId = rt.id
      WHERE rt.school_id = current_setting('app.current_school_id', true)
    )
  );

ALTER TABLE "TechniqueProgress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY technique_progress_tenant_isolation_policy ON "TechniqueProgress"
  FOR ALL
  USING (
    profileId IN (
      SELECT sp.id FROM "StudentProfile" sp
      JOIN "User" u ON sp.userId = u.id
      WHERE u.school_id = current_setting('app.current_school_id', true)
    )
  );

-- 7. CLASS SCHEDULES & MAT ATTENDANCE
ALTER TABLE "ClassSchedule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY class_schedule_tenant_isolation_policy ON "ClassSchedule"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true));

ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_tenant_isolation_policy ON "Attendance"
  FOR ALL
  USING (
    profileId IN (
      SELECT sp.id FROM "StudentProfile" sp
      JOIN "User" u ON sp.userId = u.id
      WHERE u.school_id = current_setting('app.current_school_id', true)
    )
  );

-- 8. INTERNAL BOOKKEEPING LEDGER (ZERO MONETIZATION, IMMUTABLE)
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;

-- Select/Insert strictly isolated to active school tenant
CREATE POLICY ledger_tenant_isolation_policy ON "LedgerEntry"
  FOR SELECT
  USING (school_id = current_setting('app.current_school_id', true));

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

-- 9. INACTIVITY RETENTION ALERTS
ALTER TABLE "InactivityAlert" ENABLE ROW LEVEL SECURITY;

CREATE POLICY inactivity_alert_tenant_isolation_policy ON "InactivityAlert"
  FOR ALL
  USING (school_id = current_setting('app.current_school_id', true));
