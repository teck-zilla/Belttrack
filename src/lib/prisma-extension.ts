/**
 * BeltTrack Martial Arts Management - Multi-Tenant Prisma Query Extension
 * Document Reference: PRD Section 4.2 (Prisma Extension Safeguard)
 *
 * Automatically enforces tenant isolation across all Prisma queries by
 * injecting active school_id into queries and verifying tenant boundaries.
 */

import { prisma } from '@/lib/prisma';

export interface TenantQueryContext {
  schoolId: string;
}

export interface TenantTransactionContext extends TenantQueryContext {
  userId: string;
}

const TENANT_MODELS = new Set([
  'User',
  'StudentProfile',
  'GuardianStudent',
  'RankTrack',
  'Rank',
  'Technique',
  'TechniqueProgress',
  'ClassSchedule',
  'Attendance',
  'LedgerEntry',
  'InactivityAlert',
  'ReceiptCounter',
  'DeletionRequest'
]);

type OperationArgs = Record<string, unknown>;

function scopeWhere(model: string, where: unknown, schoolId: string): unknown {
  const current = where && typeof where === 'object' ? (where as Record<string, unknown>) : {};

  if (model === 'School') {
    return { ...current, id: schoolId };
  }

  return { ...current, schoolId };
}

function scopeData(model: string, data: unknown, schoolId: string): unknown {
  if (model === 'School') return data;

  if (Array.isArray(data)) {
    return data.map((item) => scopeData(model, item, schoolId));
  }

  if (!data || typeof data !== 'object') return data;

  const current = data as Record<string, unknown>;

  if (current.schoolId !== undefined && current.schoolId !== schoolId) {
    throw new Error('Tenant isolation violation: payload schoolId does not match the session tenant.');
  }

  return { ...current, schoolId };
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

export function createTenantPrisma(schoolId: string) {
  if (!schoolId) {
    throw new Error('Tenant isolation violation: schoolId must be provided for all private operations.');
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || (!TENANT_MODELS.has(model) && model !== 'School')) {
            return query(args);
          }

          if (
            model === 'School' &&
            (operation === 'create' || operation === 'createMany' || operation === 'createManyAndReturn' || operation === 'upsert')
          ) {
            throw new Error('School creation and upserts must use the base Prisma client.');
          }

          const nextArgs = { ...(args as OperationArgs) } as OperationArgs;

          if (operation === 'create' || operation === 'createMany' || operation === 'createManyAndReturn') {
            nextArgs.data = scopeData(model, nextArgs.data, schoolId);
          } else if (operation === 'upsert') {
            nextArgs.where = scopeWhere(model, nextArgs.where, schoolId);
            nextArgs.create = scopeData(model, nextArgs.create, schoolId);
          } else {
            nextArgs.where = scopeWhere(model, nextArgs.where, schoolId);
          }

          return query(nextArgs as typeof args);
        }
      }
    }
  });
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

export async function withTenantTransaction<T>(
  context: TenantTransactionContext,
  fn: (tx: TenantPrismaClient) => Promise<T>
): Promise<T> {
  const tenant = createTenantPrisma(context.schoolId);

  return tenant.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_school_id', ${context.schoolId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`;

    return fn(tx as unknown as TenantPrismaClient);
  });
}
