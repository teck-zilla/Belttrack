import { PrismaClient, Role, MembershipStatus, PaymentMethod, TransactionType, TechniqueStatus } from '@prisma/client';

const prisma = new PrismaClient();

const confirm = process.argv.includes('--confirm');
if (!confirm) {
  console.error('Refusing to write demo data. Re-run with: node scripts/seed-demo-data.mjs --confirm');
  process.exit(1);
}

const now = new Date('2026-11-19T12:00:00.000Z');
const day = 24 * 60 * 60 * 1000;
const daysAgo = (count) => new Date(now.getTime() - count * day);

const schoolId = '00000000-0000-4000-8000-000000000001';
const rankTrackId = '00000000-0000-4000-8000-000000000002';
const whiteRankId = '00000000-0000-4000-8000-000000000003';
const blueRankId = '00000000-0000-4000-8000-000000000004';
const ownerId = '00000000-0000-4000-8000-000000000010';
const coachId = '00000000-0000-4000-8000-000000000011';
const studentId = '00000000-0000-4000-8000-000000000012';
const guardianId = '00000000-0000-4000-8000-000000000013';
const inactiveStudentId = '00000000-0000-4000-8000-000000000014';
const studentProfileId = '00000000-0000-4000-8000-000000000020';
const inactiveStudentProfileId = '00000000-0000-4000-8000-000000000021';
const classOneId = '00000000-0000-4000-8000-000000000030';
const classTwoId = '00000000-0000-4000-8000-000000000031';

const techniqueNames = [
  'Oshi-goshi',
  'Seoi-nage',
  'Koshiki-goshi',
  'Harai-goshi',
  'Uchi-mata',
  'Sasae-tsuri-komi-ashi',
  'Osoto-gari',
  'Kouchi-gari',
  'Ko-soto-gari',
  'Hane-goshi'
];

async function main() {
  await prisma.school.upsert({
    where: { id: schoolId },
    update: {
      name: 'Kaizen BJJ',
      slug: 'kaizen-bjj',
      discipline: 'brazilian_jiu_jitsu',
      city: 'Austin',
      country: 'USA',
      timezone: 'America/Chicago',
      joinCode: 'KAIZEN2026',
      isCodeActive: true,
      deletedAt: null
    },
    create: {
      id: schoolId,
      name: 'Kaizen BJJ',
      slug: 'kaizen-bjj',
      discipline: 'brazilian_jiu_jitsu',
      city: 'Austin',
      country: 'USA',
      timezone: 'America/Chicago',
      joinCode: 'KAIZEN2026',
      isCodeActive: true
    }
  });

  await prisma.rankTrack.upsert({
    where: { id: rankTrackId },
    update: { schoolId, name: 'BJJ Belt Progression' },
    create: { id: rankTrackId, schoolId, name: 'BJJ Belt Progression' }
  });

  await prisma.rank.upsert({
    where: { id: whiteRankId },
    update: {
      schoolId,
      rankTrackId,
      orderIndex: 0,
      title: 'White Belt',
      beltColorHex: '#FFFFFF',
      requiredClasses: 20,
      requiredActiveDays: 60
    },
    create: {
      id: whiteRankId,
      schoolId,
      rankTrackId,
      orderIndex: 0,
      title: 'White Belt',
      beltColorHex: '#FFFFFF',
      requiredClasses: 20,
      requiredActiveDays: 60
    }
  });

  await prisma.rank.upsert({
    where: { id: blueRankId },
    update: {
      schoolId,
      rankTrackId,
      orderIndex: 1,
      title: 'Blue Belt',
      beltColorHex: '#1D4ED8',
      requiredClasses: 50,
      requiredActiveDays: 120
    },
    create: {
      id: blueRankId,
      schoolId,
      rankTrackId,
      orderIndex: 1,
      title: 'Blue Belt',
      beltColorHex: '#1D4ED8',
      requiredClasses: 50,
      requiredActiveDays: 120
    }
  });

  const users = [
    {
      id: ownerId,
      supabaseUid: '00000000-0000-4000-8000-000000000010',
      email: 'demo-owner@belttrack.test',
      role: Role.OWNER
    },
    {
      id: coachId,
      supabaseUid: '00000000-0000-4000-8000-000000000011',
      email: 'demo-coach@belttrack.test',
      role: Role.COACH
    },
    {
      id: studentId,
      supabaseUid: '00000000-0000-4000-8000-000000000012',
      email: 'demo-student@belttrack.test',
      role: Role.STUDENT
    },
    {
      id: guardianId,
      supabaseUid: '00000000-0000-4000-8000-000000000013',
      email: 'demo-guardian@belttrack.test',
      role: Role.GUARDIAN
    },
    {
      id: inactiveStudentId,
      supabaseUid: '00000000-0000-4000-8000-000000000014',
      email: 'demo-inactive@belttrack.test',
      role: Role.STUDENT
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        schoolId,
        supabaseUid: user.supabaseUid,
        role: user.role,
        status: MembershipStatus.ACTIVE,
        isEmailVerified: true
      },
      create: {
        id: user.id,
        schoolId,
        supabaseUid: user.supabaseUid,
        email: user.email,
        role: user.role,
        status: MembershipStatus.ACTIVE,
        isEmailVerified: true
      }
    });
  }

  await prisma.studentProfile.upsert({
    where: { id: studentProfileId },
    update: {
      schoolId,
      userId: studentId,
      firstName: 'Maya',
      lastName: 'Chen',
      dateOfBirth: new Date('1996-04-18T00:00:00.000Z'),
      isMinor: false,
      currentRankId: blueRankId,
      lastPromotionDate: daysAgo(142)
    },
    create: {
      id: studentProfileId,
      schoolId,
      userId: studentId,
      firstName: 'Maya',
      lastName: 'Chen',
      dateOfBirth: new Date('1996-04-18T00:00:00.000Z'),
      isMinor: false,
      currentRankId: blueRankId,
      lastPromotionDate: daysAgo(142)
    }
  });

  await prisma.studentProfile.upsert({
    where: { id: inactiveStudentProfileId },
    update: {
      schoolId,
      userId: inactiveStudentId,
      firstName: 'Noah',
      lastName: 'Williams',
      dateOfBirth: new Date('2012-09-02T00:00:00.000Z'),
      isMinor: true,
      currentRankId: whiteRankId,
      lastPromotionDate: daysAgo(90)
    },
    create: {
      id: inactiveStudentProfileId,
      schoolId,
      userId: inactiveStudentId,
      firstName: 'Noah',
      lastName: 'Williams',
      dateOfBirth: new Date('2012-09-02T00:00:00.000Z'),
      isMinor: true,
      currentRankId: whiteRankId,
      lastPromotionDate: daysAgo(90)
    }
  });

  await prisma.guardianStudent.upsert({
    where: {
      guardianId_studentId: {
        guardianId,
        studentId
      }
    },
    update: { schoolId, isApproved: true },
    create: { id: '00000000-0000-4000-8000-000000000040', schoolId, guardianId, studentId, isApproved: true }
  });

  await prisma.classSchedule.upsert({
    where: { id: classOneId },
    update: { schoolId, title: 'Adult BJJ - Fundamentals', weekday: 1, startTime: '18:00', endTime: '19:30' },
    create: { id: classOneId, schoolId, title: 'Adult BJJ - Fundamentals', weekday: 1, startTime: '18:00', endTime: '19:30' }
  });

  await prisma.classSchedule.upsert({
    where: { id: classTwoId },
    update: { schoolId, title: 'Adult BJJ - Live Rolls', weekday: 3, startTime: '18:00', endTime: '19:30' },
    create: { id: classTwoId, schoolId, title: 'Adult BJJ - Live Rolls', weekday: 3, startTime: '18:00', endTime: '19:30' }
  });

  const techniqueIds = techniqueNames.map((_, index) => `00000000-0000-4000-8000-0000000001${String(index + 1).padStart(2, '0')}`);

  for (let index = 0; index < techniqueNames.length; index += 1) {
    await prisma.technique.upsert({
      where: { id: techniqueIds[index] },
      update: {
        schoolId,
        rankId: blueRankId,
        name: techniqueNames[index],
        description: `Blue belt requirement ${index + 1} of ${techniqueNames.length}.`
      },
      create: {
        id: techniqueIds[index],
        schoolId,
        rankId: blueRankId,
        name: techniqueNames[index],
        description: `Blue belt requirement ${index + 1} of ${techniqueNames.length}.`
      }
    });

    await prisma.techniqueProgress.upsert({
      where: {
        profileId_techniqueId: {
          profileId: studentProfileId,
          techniqueId: techniqueIds[index]
        }
      },
      update: {
        schoolId,
        status: index < 8 ? TechniqueStatus.VERIFIED : TechniqueStatus.IN_PROGRESS,
        verifiedAt: index < 8 ? daysAgo(20 + index) : null,
        verifiedBy: index < 8 ? coachId : null
      },
      create: {
        id: `00000000-0000-4000-8000-0000000002${String(index + 1).padStart(2, '0')}`,
        schoolId,
        profileId: studentProfileId,
        techniqueId: techniqueIds[index],
        status: index < 8 ? TechniqueStatus.VERIFIED : TechniqueStatus.IN_PROGRESS,
        verifiedAt: index < 8 ? daysAgo(20 + index) : null,
        verifiedBy: index < 8 ? coachId : null
      }
    });
  }

  for (let index = 0; index < 42; index += 1) {
    const sequence = String(index + 1).padStart(3, '0');
    await prisma.attendance.upsert({
      where: {
        schoolId_idempotencyKey: {
          schoolId,
          idempotencyKey: `demo-student-attendance-${sequence}`
        }
      },
      update: {
        profileId: studentProfileId,
        classId: index % 2 === 0 ? classOneId : classTwoId,
        attendedAt: daysAgo(1 + index * 3)
      },
      create: {
        id: `00000000-0000-4000-8000-0000000003${sequence}`,
        schoolId,
        idempotencyKey: `demo-student-attendance-${sequence}`,
        profileId: studentProfileId,
        classId: index % 2 === 0 ? classOneId : classTwoId,
        attendedAt: daysAgo(1 + index * 3)
      }
    });
  }

  await prisma.attendance.upsert({
    where: {
      schoolId_idempotencyKey: {
        schoolId,
        idempotencyKey: 'demo-inactive-attendance-001'
      }
    },
    update: {
      profileId: inactiveStudentProfileId,
      classId: classOneId,
      attendedAt: daysAgo(14)
    },
    create: {
      id: '00000000-0000-4000-8000-000000000390',
      schoolId,
      idempotencyKey: 'demo-inactive-attendance-001',
      profileId: inactiveStudentProfileId,
      classId: classOneId,
      attendedAt: daysAgo(14)
    }
  });

  await prisma.inactivityAlert.upsert({
    where: {
      schoolId_profileId: {
        schoolId,
        profileId: inactiveStudentProfileId
      }
    },
    update: { daysInactive: 14, isResolved: false },
    create: {
      id: '00000000-0000-4000-8000-000000000041',
      schoolId,
      profileId: inactiveStudentProfileId,
      daysInactive: 14,
      isResolved: false
    }
  });

  const ledgerEntries = [
    {
      slug: 'REC-2026-BJJ-0001',
      amountCents: 15000,
      type: TransactionType.TUITION,
      method: PaymentMethod.CASH,
      reversalRefSlug: null,
      note: 'September tuition'
    },
    {
      slug: 'REC-2026-BJJ-0002',
      amountCents: -15000,
      type: TransactionType.CORRECTION_REVERSAL,
      method: PaymentMethod.CASH,
      reversalRefSlug: 'REC-2026-BJJ-0001',
      note: 'Offsetting reversal for duplicate entry'
    },
    {
      slug: 'REC-2026-BJJ-0003',
      amountCents: 15000,
      type: TransactionType.TUITION,
      method: PaymentMethod.BANK_TRANSFER,
      reversalRefSlug: null,
      note: 'October tuition'
    }
  ];

  for (let index = 0; index < ledgerEntries.length; index += 1) {
    const entry = ledgerEntries[index];
    await prisma.ledgerEntry.upsert({
      where: {
        schoolId_receiptSlug: {
          schoolId,
          receiptSlug: entry.slug
        }
      },
      update: {
        userId: studentId,
        amountCents: entry.amountCents,
        currency: 'USD',
        paymentMethod: entry.method,
        transactionType: entry.type,
        reversalRefSlug: entry.reversalRefSlug,
        note: entry.note
      },
      create: {
        id: `00000000-0000-4000-8000-0000000005${String(index + 1).padStart(2, '0')}`,
        schoolId,
        userId: studentId,
        receiptSlug: entry.slug,
        amountCents: entry.amountCents,
        currency: 'USD',
        paymentMethod: entry.method,
        transactionType: entry.type,
        reversalRefSlug: entry.reversalRefSlug,
        note: entry.note,
        createdAt: daysAgo(60 - index * 30)
      }
    });
  }

  await prisma.receiptCounter.upsert({
    where: {
      schoolId_year_discipline: {
        schoolId,
        year: 2026,
        discipline: 'brazilian_jiu_jitsu'
      }
    },
    update: { lastIncrement: ledgerEntries.length },
    create: {
      id: '00000000-0000-4000-8000-000000000060',
      schoolId,
      year: 2026,
      discipline: 'brazilian_jiu_jitsu',
      lastIncrement: ledgerEntries.length
    }
  });

  console.log('Demo seed complete for Kaizen BJJ.');
  console.log('Auth users must be created separately with the demo Supabase UIDs and emails above.');
  console.log('Database rows were scoped to school_id 00000000-0000-4000-8000-000000000001.');
}

main()
  .catch((error) => {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
