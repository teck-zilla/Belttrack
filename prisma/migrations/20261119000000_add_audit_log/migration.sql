CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_school_id_created_at_idx" ON "AuditLog"("school_id", "created_at");
CREATE INDEX "AuditLog_school_id_action_idx" ON "AuditLog"("school_id", "action");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_select_policy ON "AuditLog"
  FOR SELECT
  USING (school_id = current_setting('app.current_school_id', true));

CREATE POLICY audit_log_tenant_insert_policy ON "AuditLog"
  FOR INSERT
  WITH CHECK (school_id = current_setting('app.current_school_id', true));

CREATE POLICY audit_log_block_update ON "AuditLog"
  FOR UPDATE
  USING (false);

CREATE POLICY audit_log_block_delete ON "AuditLog"
  FOR DELETE
  USING (false);

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog rows are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
