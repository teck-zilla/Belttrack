import { NextResponse } from 'next/server';
import { requireActiveStaff } from '@/lib/auth-guard';
import { ledgerEntrySchema } from '@/lib/validation/schemas';
import { withTenantTransaction } from '@/lib/prisma-extension';
import { formatReceiptSlug, getReceiptDisciplineCode } from '@/lib/tenant-constants';

export async function POST(request: Request) {
  try {
    const guard = await requireActiveStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body' },
        { status: 400 }
      );
    }

    const parsed = ledgerEntrySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid ledger entry parameters' },
        { status: 400 }
      );
    }

    const outcome = await withTenantTransaction(
      { schoolId: guard.user.schoolId, userId: guard.user.userId },
      async (tx) => {
        const school = await tx.school.findFirst({
          where: { id: guard.user.schoolId },
          select: { discipline: true }
        });

        if (!school) {
          return { ok: false as const, status: 404, error: 'School tenant not found.' };
        }

        if (parsed.data.memberUserId) {
          const member = await tx.user.findFirst({
            where: { id: parsed.data.memberUserId, schoolId: guard.user.schoolId },
            select: { id: true }
          });

          if (!member) {
            return { ok: false as const, status: 404, error: 'Member not found in this school.' };
          }
        }

        if (parsed.data.reversalRefSlug) {
          const original = await tx.ledgerEntry.findFirst({
            where: {
              schoolId: guard.user.schoolId,
              receiptSlug: parsed.data.reversalRefSlug
            },
            select: { id: true }
          });

          if (!original) {
            return { ok: false as const, status: 404, error: 'Reversal reference receipt not found in this school.' };
          }
        }

        const year = new Date().getFullYear();
        const disciplineCode = getReceiptDisciplineCode(school.discipline);

        const counter = await tx.receiptCounter.upsert({
          where: {
            schoolId_year_discipline: {
              schoolId: guard.user.schoolId,
              year,
              discipline: disciplineCode
            }
          },
          create: {
            schoolId: guard.user.schoolId,
            year,
            discipline: disciplineCode,
            lastIncrement: 1
          },
          update: {
            lastIncrement: { increment: 1 }
          }
        });

        const receiptSlug = formatReceiptSlug(year, disciplineCode, counter.lastIncrement);

        const entry = await tx.ledgerEntry.create({
          data: {
            schoolId: guard.user.schoolId,
            userId: parsed.data.memberUserId ?? guard.user.userId,
            receiptSlug,
            amountCents: parsed.data.amountCents,
            currency: parsed.data.currency.toUpperCase(),
            paymentMethod: parsed.data.paymentMethod,
            transactionType: parsed.data.transactionType,
            reversalRefSlug: parsed.data.reversalRefSlug ?? null,
            note: parsed.data.note ?? null
          }
        });

        return { ok: true as const, entry };
      }
    );

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    const entry = outcome.entry;

    return NextResponse.json(
      {
        success: true,
        entry: {
          id: entry.id,
          receiptSlug: entry.receiptSlug,
          amountCents: entry.amountCents,
          currency: entry.currency,
          paymentMethod: entry.paymentMethod,
          transactionType: entry.transactionType,
          reversalRefSlug: entry.reversalRefSlug,
          note: entry.note,
          userId: entry.userId,
          createdAt: entry.createdAt.toISOString()
        }
      },
      { status: 201 }
    );
  } catch {
    console.error('[BELTTRACK LEDGER] POST error');
    return NextResponse.json(
      { error: 'Unable to record the ledger entry. Please try again later.' },
      { status: 500 }
    );
  }
}
