import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Tenant isolation violation: schoolId query parameter is required.' },
        { status: 400 }
      );
    }

    // Query pending users strictly isolated by schoolId
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
    const message = err instanceof Error ? err.message : 'Database error fetching approvals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid or missing JSON payload in request body.' },
        { status: 400 }
      );
    }
    const { schoolId, userId, action } = body;

    if (!schoolId || !userId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: schoolId, userId, and action are required.' },
        { status: 400 }
      );
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { error: 'Invalid action. Must be either APPROVE or REJECT.' },
        { status: 400 }
      );
    }

    // Verify user belongs strictly to the active schoolId
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

    // Update status in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
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
        // Fallback for mock/preview environment
      }
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      userId: updatedUser.id
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error processing approval';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
