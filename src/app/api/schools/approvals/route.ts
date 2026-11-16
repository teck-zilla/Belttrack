import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireActiveStaff } from '@/lib/auth-guard';

export async function GET() {
  try {
    // Session required. Tenant school_id is derived from the DB user, never the request.
    const guard = await requireActiveStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const schoolId = guard.user.schoolId;

    // Query pending users strictly isolated by the session-derived schoolId
    const pendingUsers = await prisma.user.findMany({
      where: {
        schoolId,
        status: 'PENDING_APPROVAL'
      },
      include: {
        profile: true,
        guardianLinks: {
          include: {
            guardian: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Count active and pending members for stats
    const [pendingCount, activeCount] = await Promise.all([
      prisma.user.count({
        where: { schoolId, status: 'PENDING_APPROVAL' }
      }),
      prisma.user.count({
        where: { schoolId, status: 'ACTIVE' }
      })
    ]);

    const formattedPending = pendingUsers.map((u) => ({
      id: u.id,
      userId: u.id,
      schoolId: u.schoolId,
      email: u.email,
      role: u.role.toLowerCase(),
      status: u.status.toLowerCase(),
      fullName: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email,
      isMinor: u.profile?.isMinor ?? false,
      guardianName: u.guardianLinks[0]?.guardian?.email ? u.guardianLinks[0].guardian.email : undefined,
      enrolledAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      pendingCount,
      activeCount,
      pendingMembers: formattedPending
    });
  } catch (err: unknown) {
    console.error('[BELTTRACK AUTH /api/schools/approvals] GET error:', err);
    return NextResponse.json(
      { error: 'Unable to load approvals. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Session required. Tenant school_id is derived from the DB user, never the request.
    const guard = await requireActiveStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const schoolId = guard.user.schoolId;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body.' },
        { status: 400 }
      );
    }

    const userId = typeof body.userId === 'string' ? body.userId : '';
    const action = typeof body.action === 'string' ? body.action : '';

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and action are required.' },
        { status: 400 }
      );
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { error: 'Invalid action. Must be either APPROVE or REJECT.' },
        { status: 400 }
      );
    }

    // Never trust a body-supplied schoolId: scope the lookup to the session tenant.
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Tenant record not found or tenant isolation mismatch.' },
        { status: 404 }
      );
    }

    const nextStatus = action === 'APPROVE' ? 'ACTIVE' : 'SUSPENDED';

    // Update status in database, scoped to the same tenant.
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { status: nextStatus }
    });

    // Sync Supabase Auth metadata if supabaseUid is bound
    if (user.supabaseUid) {
      try {
        const admin = getAdminClient();
        await admin.auth.admin.updateUserById(user.supabaseUid, {
          user_metadata: {
            status: nextStatus
          }
        });
      } catch {
        // Metadata sync is best-effort; the DB status is the source of truth.
      }
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      userId: updatedUser.id
    });
  } catch (err: unknown) {
    console.error('[BELTTRACK AUTH /api/schools/approvals] POST error:', err);
    return NextResponse.json(
      { error: 'Unable to process the approval. Please try again later.' },
      { status: 500 }
    );
  }
}
