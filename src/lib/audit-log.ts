import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';

type AuditLogWriter =
  | Pick<PrismaClient, '$executeRaw'>
  | Pick<Prisma.TransactionClient, '$executeRaw'>;

export interface AuditLogInput {
  schoolId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function writeAuditLog(
  client: AuditLogWriter,
  input: AuditLogInput
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

  await client.$executeRaw`
    INSERT INTO "AuditLog" (
      "id",
      "school_id",
      "actor_user_id",
      "action",
      "target_type",
      "target_id",
      "metadata",
      "created_at"
    )
    VALUES (
      ${randomUUID()},
      ${input.schoolId},
      ${input.actorUserId},
      ${input.action},
      ${input.targetType},
      ${input.targetId ?? null},
      ${metadata}::jsonb,
      NOW()
    )
  `;
}
