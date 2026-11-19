import { randomUUID } from 'node:crypto';
import { expect, test, type APIResponse } from '@playwright/test';

async function expectOk(response: APIResponse): Promise<Record<string, unknown>> {
  const body = await response.text();
  expect(response.ok(), body).toBeTruthy();
  return body ? JSON.parse(body) : {};
}

test('school registration flow creates a tenant', async ({ page }) => {
  await page.route('**/api/schools/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        school: {
          id: randomUUID(),
          name: 'River Dojo',
          discipline: 'judo',
          registration_code: 'RIVER-JUD-2026',
          joinCode: 'RIVER-JUD-2026',
          city: 'Austin',
          country: 'US'
        },
        user: {
          id: randomUUID(),
          supabaseUid: randomUUID()
        }
      })
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Register New School Tenant' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.locator('#reg-school-name').fill('River Dojo');
  await page.locator('#reg-discipline').selectOption('judo');
  await page.locator('#reg-code').fill('RIVER-JUD-2026');
  await page.locator('#reg-city').fill('Austin');
  await page.locator('#reg-country').fill('US');
  await page.locator('#reg-timezone').selectOption('UTC');
  await page.locator('#reg-owner-name').fill('Alex Rivera');
  await page.locator('#reg-owner-email').fill('owner@example.com');
  await page.locator('#reg-owner-password').fill('CorrectHorseBatteryStaple1!');
  await page.locator('#reg-owner-confirm-password').fill('CorrectHorseBatteryStaple1!');
  await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check();
  await page.getByRole('button', { name: 'Create Dojo Tenant' }).click();

  await expect(page.getByText(/Dojo Launchpad/)).toBeVisible();
});

test('join code flow submits enrollment for approval', async ({ page }) => {
  await page.route('**/api/students/join', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        school: {
          id: randomUUID(),
          name: 'River Dojo'
        },
        user: {
          id: randomUUID(),
          status: 'PENDING_APPROVAL',
          supabaseUid: randomUUID()
        }
      })
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Enter School Join Code' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.locator('#join-code').fill('RIVER-JUD-2026');
  await page.locator('#join-student-name').fill('Jamie Rivera');
  await page.locator('#join-date-of-birth').fill('1995-05-15');
  await page.locator('#join-student-email').fill('jamie@example.com');
  await page.locator('#join-password').fill('CorrectHorseBatteryStaple1!');
  await page.locator('#join-confirm-password').fill('CorrectHorseBatteryStaple1!');
  await page.locator('#join-terms-check').check();
  await page.getByRole('button', { name: 'Verify & Join Dojo' }).click();

  await expect(page.getByText('Enrollment Submitted')).toBeVisible();
});

test('staff lifecycle approves attendance technique sign-off and ledger entry', async ({ browser, baseURL }) => {
  const storageState = process.env.E2E_STAFF_STORAGE_STATE;
  const profileId = process.env.E2E_PROFILE_ID;
  const techniqueId = process.env.E2E_TECHNIQUE_ID;
  const classId = process.env.E2E_CLASS_ID;

  test.skip(
    !storageState || !profileId || !techniqueId,
    'E2E_STAFF_STORAGE_STATE, E2E_PROFILE_ID, and E2E_TECHNIQUE_ID are required'
  );

  const origin = baseURL ?? 'http://127.0.0.1:3000';
  const context = await browser.newContext({ storageState, baseURL: origin });

  try {
    const headers = { Origin: origin };
    const approvals = await expectOk(await context.request.get('/api/schools/approvals', { headers }));
    const pending = (approvals.pendingMembers as Array<{ userId: string }>)[0];
    expect(pending, 'A pending member is required for this lifecycle test').toBeTruthy();

    const approval = await expectOk(await context.request.post('/api/schools/approvals', {
      headers,
      data: { userId: pending.userId, action: 'APPROVE' }
    }));
    expect(approval.status).toBe('ACTIVE');

    const attendance = await expectOk(await context.request.post('/api/attendance', {
      headers,
      data: {
        idempotencyKey: randomUUID(),
        profileId,
        classId
      }
    }));
    expect(attendance.profileId).toBe(profileId);

    const signoff = await expectOk(await context.request.post('/api/techniques/verify', {
      headers,
      data: { profileId, techniqueId, status: 'VERIFIED' }
    }));
    expect(signoff).toBeTruthy();

    const ledger = await expectOk(await context.request.post('/api/ledger', {
      headers,
      data: {
        memberUserId: pending.userId,
        amountCents: 5000,
        currency: 'USD',
        transactionType: 'TUITION',
        paymentMethod: 'CASH'
      }
    }));
    const entry = ledger.entry as { receiptSlug: string };
    expect(entry.receiptSlug).toMatch(/^REC-\d{4}-[A-Z0-9]+-\d+$/);
  } finally {
    await context.close();
  }
});
