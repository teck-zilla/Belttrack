/**
 * BeltTrack Martial Arts Management - Multi-Tenant Prisma Query Extension
 * Document Reference: PRD Section 4.2 (Prisma Extension Safeguard)
 * 
 * Automatically enforces tenant isolation across all Prisma queries by
 * injecting active school_id into queries and verifying tenant boundaries.
 */

export interface TenantQueryContext {
  schoolId: string;
}

/**
 * Creates a scoped query filter enforcing school_id on any tenant-scoped entity.
 */
export function createTenantScope(schoolId: string) {
  if (!schoolId) {
    throw new Error('Tenant isolation violation: schoolId must be provided for all private operations.');
  }

  return {
    where: {
      schoolId
    }
  };
}

/**
 * Validates that an incoming payload strictly matches the active school_id tenant boundary.
 */
export function assertTenantMatch(recordSchoolId: string, sessionSchoolId: string): void {
  if (recordSchoolId !== sessionSchoolId) {
    throw new Error(
      `Access denied: Target record tenant (${recordSchoolId}) does not match session tenant (${sessionSchoolId}).`
    );
  }
}
