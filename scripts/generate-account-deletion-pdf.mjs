/**
 * BeltTrack Account Deletion Lifecycle PDF Generator
 *
 * Produces docs/account-deletion-lifecycle-implementation.pdf with the full
 * implementation record for the user and school deletion workflows.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_MARGIN = 54;
const COLORS = {
  primary: '#1B2A4A',
  body: '#252A33',
  muted: '#5C6470',
  accent: '#2563EB',
  line: '#D8DCE3',
  panel: '#F4F6FA',
  warning: '#9A6700',
  success: '#176B3A'
};

function hexToRgb(hex) {
  const clean = hex.replace('#', '').slice(0, 6);
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  ].map((value) => value.toFixed(4));
}

function escapePdfText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\t/g, '  ');
}

class PdfDocument {
  constructor() {
    this.pages = [];
    this.current = null;
    this.y = 0;
    this.pageNumber = 0;
  }

  addPage() {
    this.current = { streams: [] };
    this.pages.push(this.current);
    this.pageNumber += 1;
    this.y = PAGE_HEIGHT - MARGIN;

    this.raw('1 1 1 rg');
    this.raw(`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`);

    const [r, g, b] = hexToRgb(COLORS.primary);
    this.raw(`${r} ${g} ${b} rg`);
    this.raw(`0 ${PAGE_HEIGHT - 7} ${PAGE_WIDTH} 7 re f`);

    this.text('BELTTRACK ACCOUNT DELETION LIFECYCLE', MARGIN, PAGE_HEIGHT - 30, 9, 'F2', COLORS.primary);
    this.text('Implementation Report', PAGE_WIDTH - MARGIN - 105, PAGE_HEIGHT - 30, 8, 'F1', COLORS.muted);
    this.text(
      'Private multi-tenant martial arts management platform',
      MARGIN,
      PAGE_HEIGHT - 43,
      7.5,
      'F1',
      COLORS.muted
    );
    this.rule(PAGE_HEIGHT - 51);

    this.y = PAGE_HEIGHT - 72;
  }

  ensureSpace(height) {
    if (this.y - height < BOTTOM_MARGIN) {
      this.addPage();
    }
  }

  raw(value) {
    this.current.streams.push(value);
  }

  text(value, x, y, size = 10, font = 'F1', color = COLORS.body) {
    const [r, g, b] = hexToRgb(color);
    this.raw('BT');
    this.raw(`/${font} ${size} Tf`);
    this.raw(`${r} ${g} ${b} rg`);
    this.raw(`${x} ${y} Td`);
    this.raw(`(${escapePdfText(value)}) Tj`);
    this.raw('ET');
  }

  rule(y, color = COLORS.line, width = 1) {
    const [r, g, b] = hexToRgb(color);
    this.raw(`${r} ${g} ${b} RG`);
    this.raw(`${width} w`);
    this.raw(`${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l s`);
  }

  panel(height, color = COLORS.panel) {
    const [r, g, b] = hexToRgb(color);
    this.raw(`${r} ${g} ${b} rg`);
    this.raw(`${MARGIN} ${this.y - height} ${CONTENT_WIDTH} ${height} re f`);
  }

  wrap(text, maxWidth, size, font) {
    const widthFactor = font === 'F2' ? 0.58 : 0.51;
    const maxChars = Math.max(8, Math.floor(maxWidth / (size * widthFactor)));
    const output = [];

    for (const rawLine of String(text).split('\n')) {
      const words = rawLine.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
      if (words.length === 0) {
        output.push('');
        continue;
      }

      let line = '';
      for (const word of words) {
        if (word.length > maxChars) {
          if (line) {
            output.push(line);
            line = '';
          }
          let remaining = word;
          while (remaining.length > maxChars) {
            output.push(remaining.slice(0, maxChars));
            remaining = remaining.slice(maxChars);
          }
          line = remaining;
          continue;
        }

        const candidate = line ? `${line} ${word}` : word;
        if (candidate.length > maxChars) {
          output.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }

      if (line) output.push(line);
    }

    return output;
  }

  paragraph(text, options = {}) {
    const size = options.size ?? 9.5;
    const font = options.font ?? 'F1';
    const color = options.color ?? COLORS.body;
    const lineHeight = options.lineHeight ?? 13;
    const indent = options.indent ?? 0;
    const prefix = options.prefix ?? '';
    const maxWidth = CONTENT_WIDTH - indent;

    const lines = this.wrap(text, maxWidth, size, font);
    lines.forEach((line, index) => {
      this.ensureSpace(lineHeight);
      const actual = index === 0 ? `${prefix}${line}` : `${' '.repeat(prefix.length)}${line}`;
      this.text(actual, MARGIN + indent, this.y, size, font, color);
      this.y -= lineHeight;
    });
    this.y -= options.after ?? 3;
  }

  bullet(text) {
    this.paragraph(text, { indent: 12, prefix: '- ', lineHeight: 12.5, size: 9.2 });
  }

  heading(text) {
    this.ensureSpace(34);
    this.y -= 6;
    this.text(text.toUpperCase(), MARGIN, this.y, 11, 'F2', COLORS.primary);
    this.y -= 7;
    this.rule(this.y, COLORS.accent, 1.2);
    this.y -= 14;
  }

  subheading(text) {
    this.ensureSpace(24);
    this.text(text, MARGIN, this.y, 9.5, 'F2', COLORS.primary);
    this.y -= 13;
  }

  labelValue(label, value) {
    this.ensureSpace(14);
    this.text(label, MARGIN, this.y, 8.5, 'F2', COLORS.muted);
    this.text(value, MARGIN + 118, this.y, 8.5, 'F1', COLORS.body);
    this.y -= 12.5;
  }

  callout(title, text, tone = 'accent') {
    const color = tone === 'success' ? COLORS.success : tone === 'warning' ? COLORS.warning : COLORS.accent;
    const lines = this.wrap(text, CONTENT_WIDTH - 24, 8.8, 'F1');
    const height = 25 + lines.length * 11.5;

    this.ensureSpace(height + 8);
    this.panel(height);
    const [r, g, b] = hexToRgb(color);
    this.raw(`${r} ${g} ${b} RG`);
    this.raw(`2 w`);
    this.raw(`${MARGIN} ${this.y - height} m ${MARGIN} ${this.y} l s`);

    this.text(title, MARGIN + 12, this.y - 13, 8.5, 'F2', color);
    let lineY = this.y - 25;
    for (const line of lines) {
      this.text(line, MARGIN + 12, lineY, 8.8, 'F1', COLORS.body);
      lineY -= 11.5;
    }
    this.y -= height + 10;
  }

  finish() {
    const totalPages = this.pages.length;
    this.pages.forEach((page, index) => {
      const [r, g, b] = hexToRgb(COLORS.muted);
      const content = [
        `${r} ${g} ${b} RG`,
        '0.6 w',
        `${MARGIN} ${BOTTOM_MARGIN - 10} m ${PAGE_WIDTH - MARGIN} ${BOTTOM_MARGIN - 10} l s`
      ];
      page.streams.push(...content);
      page.streams.push('BT');
      page.streams.push('/F1 7.2 Tf');
      page.streams.push(`${r} ${g} ${b} rg`);
      page.streams.push(`${MARGIN} ${BOTTOM_MARGIN - 24} Td`);
      page.streams.push(
        `(BeltTrack Account Deletion Lifecycle  |  Implementation Report  |  Page ${index + 1} of ${totalPages}) Tj`
      );
      page.streams.push('ET');
    });

    return this.build();
  }

  build() {
    const objects = [];
    const catalogId = 1;
    const pagesRootId = 2;
    const regularFontId = 3;
    const boldFontId = 4;
    const italicFontId = 5;

    objects.push({
      id: regularFontId,
      content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    });
    objects.push({
      id: boldFontId,
      content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
    });
    objects.push({
      id: italicFontId,
      content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>'
    });

    let objectCount = 5;
    const pageObjectIds = [];

    for (const page of this.pages) {
      const stream = page.streams.join('\n');
      const streamBuffer = Buffer.from(stream, 'utf8');
      objectCount += 1;
      const contentId = objectCount;
      objects.push({
        id: contentId,
        content: `<< /Length ${streamBuffer.length} >>\nstream\n${stream}\nendstream`
      });

      objectCount += 1;
      const pageId = objectCount;
      pageObjectIds.push(pageId);
      objects.push({
        id: pageId,
        content: `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R /F3 ${italicFontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      });
    }

    objects.push({ id: catalogId, content: `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>` });
    objects.push({
      id: pagesRootId,
      content: `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`
    });

    const allObjects = objects.sort((a, b) => a.id - b.id);
    let pdf = '%PDF-1.4\n%BT\n';
    const offsets = [];

    for (const object of allObjects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object.id} 0 obj\n${object.content}\nendobj\n`;
    }

    const startXref = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${allObjects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${allObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(pdf, 'utf8');
  }
}

const doc = new PdfDocument();
doc.addPage();

doc.text('BeltTrack Account Deletion Lifecycle', MARGIN, doc.y, 22, 'F2', COLORS.primary);
doc.y -= 20;
doc.text('Implementation and Operations Report', MARGIN, doc.y, 12, 'F1', COLORS.accent);
doc.y -= 24;

doc.labelValue('Document date:', '17 November 2026');
doc.labelValue('Repository:', 'teck-zilla/Belttrack');
doc.labelValue('Working branch:', 'second-branch');
doc.labelValue('Migration:', '20261117160000_account_deletion_lifecycle');
doc.labelValue('Status:', 'Implemented, migrated, and locally verified');
doc.y -= 4;

doc.callout(
  'DELIVERY SUMMARY',
  'BeltTrack now supports a reversible 14-day deletion grace period for individual members and whole-school tenants. Members submit deletion requests, owners and coaches review them, owners can close a school tenant, and a protected internal endpoint performs the irreversible purge after the grace period.',
  'success'
);

doc.heading('1. Scope and product decisions');
doc.paragraph(
  'The implementation applies to both user accounts and school accounts. The grace period is 14 days from approval or owner scheduling. Approved accounts are locked immediately so private records cannot be read or changed while the purge is pending.'
);
doc.bullet('Members submit their own deletion request with an optional reason.');
doc.bullet('Owners and coaches can approve, reject, or directly schedule deletion for active members.');
doc.bullet('Owners cannot request personal deletion through the member workflow; they must use school deletion.');
doc.bullet('School deletion is owner-only and immediately disables tenant access and the public join code.');
doc.bullet('Owners and members can cancel a scheduled deletion during the grace period.');
doc.bullet('The immutable ledger is never deleted. School purge uses a tombstone instead of a cascade delete.');
doc.bullet('A protected internal endpoint performs due purges; scheduling is external to the application process.');

doc.heading('2. Data model changes');
doc.subheading('2.1 Enumerations');
doc.paragraph(
  'MembershipStatus now includes DELETION_PENDING. Two new enums define the workflow: DeletionTargetType (USER, SCHOOL) and DeletionRequestStatus (PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED).'
);
doc.subheading('2.2 User and School fields');
doc.bullet('User.deletionRequestedAt stores when deletion was requested.');
doc.bullet('User.deletionScheduledFor stores the purge deadline and supports the status/schedule index.');
doc.bullet('School.deletionRequestedAt stores owner request time.');
doc.bullet('School.deletionScheduledFor stores the tenant purge deadline.');
doc.bullet('School.deletedAt marks the anonymized tombstone after purge.');
doc.subheading('2.3 DeletionRequest table');
doc.paragraph(
  'DeletionRequest is the durable workflow and audit record. It stores schoolId, targetType, optional targetUserId, requestedById, reviewedById, status, reason, decisionNote, requestedAt, reviewedAt, scheduledFor, completedAt, and timestamps. It deliberately has no cascading foreign keys so the audit row survives a user or school purge.'
);
doc.paragraph(
  'Indexes support open-request lookups by school and status, due-purge scans by status and scheduled time, and target lookup by type and user. RLS policy deletion_request_tenant_isolation_policy binds every row to app.current_school_id for both reads and writes.'
);

doc.heading('3. Member deletion workflow');
doc.subheading('3.1 Request');
doc.paragraph(
  'An authenticated ACTIVE member calls POST /api/account/deletion. The schoolId is derived from the database session, never from the request body. Owners are rejected with HTTP 409 and directed to school deletion. The request is created with status PENDING and requestedById set to the member.'
);
doc.subheading('3.2 Review');
doc.paragraph(
  'Owners and coaches call GET /api/schools/deletion-requests to list open requests scoped to their school. PATCH approves or rejects a PENDING request. A reviewer cannot approve their own request. On approval, the target user status changes to DELETION_PENDING and deletionScheduledFor is set to 14 days later.'
);
doc.subheading('3.3 Direct staff scheduling');
doc.paragraph(
  'POST /api/schools/deletion-requests allows staff to schedule an active member directly. The request is created as APPROVED by the acting staff member and the target is locked in the same transaction.'
);
doc.subheading('3.4 Cancellation');
doc.paragraph(
  'DELETE /api/account/deletion cancels the caller\'s open request. A PENDING request becomes CANCELLED. An APPROVED request also clears the user deletion fields and restores ACTIVE status, provided the account has not changed to another non-deletion state. Staff-initiated scheduled deletions can be cancelled by the affected active member during the grace period.'
);
doc.subheading('3.5 Purge');
doc.paragraph(
  'A due USER request verifies that the target still belongs to the request school. The Supabase auth identity is deleted first. A database transaction then removes inactivity alerts, verification codes, and the User row; profile, attendance, technique progress, and guardian links cascade from User. LedgerEntry rows are retained because they have no foreign key to User.'
);

doc.heading('4. School deletion workflow');
doc.subheading('4.1 Owner request');
doc.paragraph(
  'An OWNER calls POST /api/schools/deletion. The school row is updated in the same transaction with deletionRequestedAt, deletionScheduledFor, and isCodeActive=false. A SCHOOL DeletionRequest is created as APPROVED with requestedById and reviewedById set to the owner. All tenant access is blocked immediately by the auth guard for the next 14 days.'
);
doc.subheading('4.2 Cancellation');
doc.paragraph(
  'DELETE /api/schools/deletion is owner-only and available while the school is locked. It marks the request CANCELLED, clears the schedule fields, and restores isCodeActive=true.'
);
doc.subheading('4.3 Tombstone purge');
doc.paragraph(
  'A due SCHOOL request deletes all managed auth identities first. A database transaction then removes inactivity alerts, verification codes, users, class schedules, rank tracks, and receipt counters. The School row is anonymized to Deleted School, renamed to deleted-{id}, assigned join code DELETED-{id}, and marked deletedAt. LedgerEntry rows survive as the immutable ledger anchor.'
);
doc.paragraph(
  'This is intentionally a tombstone purge, not a cascade delete. Deleting the School row would cascade the ledger and violate the append-only accounting requirement.'
);

doc.heading('5. Authorization and tenant isolation');
doc.bullet('ActiveSessionUser now carries the user deletion schedule, school deletion schedule, and school tombstone timestamp.');
doc.bullet('requireActiveStaff and requireActiveMember reject DELETION_PENDING accounts and any scheduled or completed school deletion.');
doc.bullet('requireSessionUser allows locked sessions to read status and cancel their own deletion workflows.');
doc.bullet('The schoolId for every mutation comes from the database session, not request input.');
doc.bullet('DeletionRequest joined the tenant model extension and has a dedicated RLS policy.');
doc.bullet('The internal purge route is protected by a timing-safe bearer secret using DELETION_PURGE_SECRET or CRON_SECRET.');
doc.bullet('The purge handler processes at most 25 due requests per invocation. Failed requests remain APPROVED and retry on the next run.');

doc.heading('6. API surface');
doc.paragraph('GET /api/account/deletion - returns the caller account status and open personal request.');
doc.paragraph('POST /api/account/deletion - creates a PENDING member deletion request.');
doc.paragraph('DELETE /api/account/deletion - cancels the caller open request or scheduled personal deletion.');
doc.paragraph('GET /api/schools/deletion-requests - lists open USER requests for the staff tenant.');
doc.paragraph('POST /api/schools/deletion-requests - directly schedules an active member for deletion.');
doc.paragraph('PATCH /api/schools/deletion-requests - approves or rejects a PENDING member request.');
doc.paragraph('GET /api/schools/deletion - owner-only school deletion status.');
doc.paragraph('POST /api/schools/deletion - schedules owner-initiated school deletion.');
doc.paragraph('DELETE /api/schools/deletion - owner cancels scheduled school deletion.');
doc.paragraph('POST /api/internal/deletions/purge - protected scheduler endpoint for due purges.');

doc.heading('7. User interface');
doc.paragraph(
  'PreviewDashboard now exposes an Account button for every real session and a Deletion Requests button for owners and coaches. AccountDeletionModal renders the member request, staff approval state, scheduled cancellation, and the owner school deletion workflow. DeletionRequestsModal lists open requests with target member details, requested date, reason, grace deadline, and approve/reject actions.'
);
doc.paragraph(
  'All new components use the existing design-token utility classes. No hardcoded colors were introduced and the token audit remains at zero violations.'
);

doc.heading('8. Scheduler configuration');
doc.paragraph(
  'The purge endpoint is intentionally not scheduled inside the Next.js process. A GitHub Actions workflow at .github/workflows/purge-deletions.yml calls the endpoint hourly at minute 0 UTC and also supports manual dispatch. The workflow validates that APP_BASE_URL starts with https:// and that DELETION_PURGE_SECRET is present before issuing the request.'
);
doc.bullet('Repository secret: DELETION_PURGE_SECRET, identical to the application environment value.');
doc.bullet('Repository variable: APP_BASE_URL, for example https://app.example.com.');
doc.bullet('The workflow uses POST, bearer authentication, retry with backoff, a 60-second maximum request time, and a concurrency lock.');
doc.bullet('Scheduled GitHub workflows run from the default branch; this workflow must be on main before the hourly schedule or manual dispatch is available.');
doc.bullet('The app must be publicly reachable over HTTPS. Localhost cannot be called by GitHub Actions.');

doc.heading('9. Migration and verification');
doc.paragraph(
  'Migration 20261117160000_account_deletion_lifecycle adds the new enum value, creates both deletion enums, adds User and School scheduling columns, creates DeletionRequest, adds indexes, and installs the RLS policy. It was applied with prisma migrate deploy.'
);
doc.bullet('npx prisma validate: passed.');
doc.bullet('npx prisma migrate status: database schema is up to date.');
doc.bullet('npx tsc --noEmit --incremental false: passed.');
doc.bullet('npm run audit: 0 hardcoded color violations.');
doc.bullet('npm run build: passed; all deletion routes compiled.');
doc.bullet('Database verification: DeletionRequest queryable, DELETION_PENDING enum present, RLS policy present.');

doc.heading('10. Operations runbook');
doc.subheading('10.1 Initial setup');
doc.bullet('Set DELETION_PURGE_SECRET in the deployed application environment.');
doc.bullet('Add the same value as the GitHub Actions repository secret DELETION_PURGE_SECRET.');
doc.bullet('Add the production HTTPS origin as repository variable APP_BASE_URL.');
doc.bullet('Merge the workflow to the default branch before relying on the schedule.');
doc.subheading('10.2 Testing');
doc.bullet('Run the workflow manually with workflow_dispatch.');
doc.bullet('A missing or wrong secret must return HTTP 401.');
doc.bullet('A valid request returns HTTP 200 with processed count and per-request results.');
doc.bullet('A failed purge remains APPROVED and is retried on the next hourly run.');
doc.subheading('10.3 Rotation and monitoring');
doc.bullet('Rotate the secret by updating the application environment and GitHub secret together.');
doc.bullet('Monitor failed workflow runs and the "failed" entries in the purge response.');
doc.bullet('Hourly runs handle roughly 600 purges per day at the current batch size of 25.');
doc.bullet('The workflow never logs the bearer token; GitHub masks the configured secret.');

doc.heading('11. Assumptions and limitations');
doc.bullet('The 14-day grace period is measured in 24-hour periods from approval or owner scheduling.');
doc.bullet('The school deletion tombstone is the permanent ledger anchor; the underlying School row is retained.');
doc.bullet('Only active members can be scheduled for member deletion through staff routes.');
doc.bullet('Owners cannot delete their personal account without closing the school tenant.');
doc.bullet('No production cron is embedded in the application; an external scheduler is required.');
doc.bullet('The GitHub Actions schedule will not run until the workflow exists on the repository default branch.');
doc.bullet('The purge endpoint depends on the Supabase service-role key to delete managed auth identities.');
doc.bullet('Billing, payment gateways, push notifications, and native mobile builds remain out of scope.');

doc.callout(
  'FINAL STATE',
  'The deletion schema, APIs, guards, UI, migration, and scheduler workflow are implemented. The migration is applied. The remaining operational action is configuring the production APP_BASE_URL and DELETION_PURGE_SECRET in GitHub and merging the workflow to the default branch.',
  'warning'
);

const outputPath = path.resolve(__dirname, '../docs/account-deletion-lifecycle-implementation.pdf');
fs.writeFileSync(outputPath, doc.finish());
console.log(`[BELTTRACK] Account deletion implementation PDF generated at: ${outputPath}`);
