/**
 * BeltTrack Account Deletion Simulation Examples PDF Generator
 *
 * Produces docs/account-deletion-simulation-examples.pdf containing the four
 * persona examples, the guardian variant, and useful API examples.
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
  }

  addPage() {
    this.current = { streams: [] };
    this.pages.push(this.current);
    this.y = PAGE_HEIGHT - MARGIN;

    this.raw('1 1 1 rg');
    this.raw(`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f`);

    const [r, g, b] = hexToRgb(COLORS.primary);
    this.raw(`${r} ${g} ${b} rg`);
    this.raw(`0 ${PAGE_HEIGHT - 7} ${PAGE_WIDTH} 7 re f`);

    this.text('BELTTRACK ACCOUNT DELETION', MARGIN, PAGE_HEIGHT - 30, 9, 'F2', COLORS.primary);
    this.text('Simulation Examples', PAGE_WIDTH - MARGIN - 88, PAGE_HEIGHT - 30, 8, 'F1', COLORS.muted);
    this.text('Four personas, guardian variant, and API examples', MARGIN, PAGE_HEIGHT - 43, 7.5, 'F1', COLORS.muted);
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
    const widthFactor = font === 'F4' ? 0.6 : font === 'F2' ? 0.58 : 0.51;
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

  code(lines) {
    const codeLines = Array.isArray(lines) ? lines : [lines];
    const height = 16 + codeLines.length * 10.5;
    this.ensureSpace(height + 8);
    this.panel(height);
    let lineY = this.y - 13;
    for (const line of codeLines) {
      this.text(line, MARGIN + 10, lineY, 8, 'F4', COLORS.body);
      lineY -= 10.5;
    }
    this.y -= height + 9;
  }

  heading(text) {
    this.ensureSpace(34);
    this.y -= 6;
    this.text(text.toUpperCase(), MARGIN, this.y, 10.5, 'F2', COLORS.primary);
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
    this.text(value, MARGIN + 111, this.y, 8.5, 'F1', COLORS.body);
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
    this.raw('2 w');
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
      page.streams.push(`${r} ${g} ${b} RG`);
      page.streams.push('0.6 w');
      page.streams.push(`${MARGIN} ${BOTTOM_MARGIN - 10} m ${PAGE_WIDTH - MARGIN} ${BOTTOM_MARGIN - 10} l s`);
      page.streams.push('BT');
      page.streams.push('/F1 7.2 Tf');
      page.streams.push(`${r} ${g} ${b} rg`);
      page.streams.push(`${MARGIN} ${BOTTOM_MARGIN - 24} Td`);
      page.streams.push(
        `(BeltTrack Account Deletion Simulation Examples  |  Page ${index + 1} of ${totalPages}) Tj`
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
    const codeFontId = 6;

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
    objects.push({
      id: codeFontId,
      content: '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'
    });

    let objectCount = 6;
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
        content: `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R /F3 ${italicFontId} 0 R /F4 ${codeFontId} 0 R >> >> /Contents ${contentId} 0 R >>`
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

doc.text('Account Deletion Simulation Examples', MARGIN, doc.y, 22, 'F2', COLORS.primary);
doc.y -= 20;
doc.text('Four personas, guardian variant, and API examples', MARGIN, doc.y, 11, 'F1', COLORS.accent);
doc.y -= 24;

doc.labelValue('Document date:', '17 November 2026');
doc.labelValue('Application:', 'https://belttrack.vercel.app');
doc.labelValue('Grace period:', '14 days');
doc.labelValue('Environment:', 'Use a disposable test school');
doc.y -= 4;

doc.callout(
  'SAFE SIMULATION NOTICE',
  'Use disposable test accounts, preferably in local development or staging. Production purges are irreversible after the 14-day grace period. Do not schedule deletion for a real owner, coach, student, or guardian unless permanent deletion is intended.',
  'warning'
);

doc.heading('Example 1: Adult student requests deletion, then cancels');
doc.paragraph('This example verifies the member request, staff approval, account lock, and cancellation path.');
doc.subheading('Steps');
doc.bullet('Sign in as the student.');
doc.bullet('Click Account in the top-right.');
doc.bullet('Enter an optional reason and click Request Account Deletion.');
doc.bullet('Sign in as the owner or coach and open Deletion Requests.');
doc.bullet('Click Approve Deletion.');
doc.bullet('Sign back in as the student and open Account.');
doc.bullet('Click Cancel Scheduled Deletion.');
doc.subheading('Expected results');
doc.bullet('Initial request status is PENDING and the student can still access private data.');
doc.bullet('After approval, the student status becomes DELETION_PENDING.');
doc.bullet('Dashboard and private API requests return HTTP 403.');
doc.bullet('The student can still reach Account to cancel during the grace period.');
doc.bullet('Cancellation sets the request to CANCELLED and restores ACTIVE status.');
doc.bullet('No purge occurs.');

doc.heading('Example 2: Student deletion completes after 14 days');
doc.paragraph('This example verifies the full grace period and irreversible user purge.');
doc.subheading('Steps');
doc.bullet('Student requests deletion.');
doc.bullet('Owner or coach approves the request.');
doc.bullet('Wait until the scheduled_for timestamp passes.');
doc.bullet('The scheduler calls the protected purge endpoint.');
doc.bullet('The request is marked COMPLETED.');
doc.subheading('Expected results');
doc.bullet('The Supabase auth identity is deleted first.');
doc.bullet('The User row, profile, attendance, technique progress, and guardian links are deleted.');
doc.bullet('Existing LedgerEntry rows remain because they are not foreign-keyed to User.');
doc.bullet('The student can no longer sign in.');
doc.bullet('The deletion audit request remains COMPLETED.');
doc.subheading('Fast local or staging test');
doc.paragraph(
  'Create a disposable student, approve deletion, set that request scheduled_for to a past time in the test database, then trigger the purge endpoint.',
  { size: 9.2 }
);
doc.code([
  'Invoke-RestMethod -Method Post `',
  '  -Uri "http://localhost:3000/api/internal/deletions/purge" `',
  '  -Headers @{ Authorization = "Bearer $env:DELETION_PURGE_SECRET" } `',
  '  -ContentType "application/json" -Body "{}"'
]);
doc.paragraph('Expected response:', { size: 9.2 });
doc.code(['{"success":true,"processed":1,"results":[...]}']);

doc.heading('Example 3: Coach requests deletion; another staff member approves');
doc.paragraph('This example verifies self-review prevention and the staff review workflow.');
doc.subheading('Steps');
doc.bullet('Sign in as a coach.');
doc.bullet('Open Account and submit a personal deletion request.');
doc.bullet('Open Deletion Requests and attempt to approve your own request.');
doc.bullet('Sign in as the owner or another coach and approve the request.');
doc.bullet('Sign back in as the coach during the grace period.');
doc.subheading('Expected results');
doc.bullet('Self-approval returns HTTP 409; another owner or coach must review the request.');
doc.bullet('Approval changes the coach status to DELETION_PENDING.');
doc.bullet('The coach is locked out of private school data.');
doc.bullet('The coach can cancel from Account during the grace period.');
doc.paragraph(
  'Owner personal deletion is different: the owner cannot request personal deletion through the member workflow. The owner must use School Account Deletion.',
  { size: 9.2 }
);

doc.heading('Example 4: Owner deletes the whole school');
doc.paragraph('This example verifies immediate tenant lockout, owner cancellation, and tombstone purge.');
doc.subheading('Steps');
doc.bullet('Sign in as the owner.');
doc.bullet('Open Account and use the School tenant section.');
doc.bullet('Enter a reason and click Request School Deletion.');
doc.bullet('Verify that all tenant access is blocked.');
doc.bullet('During the grace period, click Cancel School Deletion to test restoration.');
doc.bullet('Repeat the request and allow the 14-day schedule to expire.');
doc.subheading('Expected results immediately after request');
doc.bullet('School.isCodeActive becomes false.');
doc.bullet('Owner, coach, student, and guardian access returns HTTP 403.');
doc.bullet('The school disappears from the public directory.');
doc.bullet('The school request is APPROVED with a 14-day schedule.');
doc.subheading('Expected results after cancellation');
doc.bullet('The request becomes CANCELLED.');
doc.bullet('Deletion schedule fields are cleared.');
doc.bullet('Tenant access and the join code are restored.');
doc.subheading('Expected results after purge');
doc.bullet('All managed school auth identities are deleted.');
doc.bullet('Users, profiles, attendance, classes, rank tracks, techniques, and receipt counters are removed.');
doc.bullet('The School row is anonymized as a tombstone.');
doc.bullet('The immutable ledger remains as the permanent accounting anchor.');

doc.heading('Guardian variant');
doc.paragraph(
  'A guardian follows the same member flow as a student, but the dependent relationship changes the expected purge result.'
);
doc.bullet('Guardian submits a personal deletion request through Account.');
doc.bullet('Owner or coach approves it through Deletion Requests.');
doc.bullet('The guardian is locked for 14 days and can cancel during the grace period.');
doc.bullet('Purge deletes the guardian user and guardian-student links.');
doc.bullet('The dependent student account and student profile remain intact.');
doc.bullet('Any ledger entries associated with the guardian remain because the ledger is immutable.');

doc.heading('Useful API examples');
doc.paragraph('All account and school endpoints require an authenticated session cookie.');
doc.code([
  'GET    /api/account/deletion',
  'POST   /api/account/deletion',
  'DELETE /api/account/deletion',
  'GET    /api/schools/deletion-requests',
  'POST   /api/schools/deletion-requests',
  'PATCH  /api/schools/deletion-requests',
  'GET    /api/schools/deletion',
  'POST   /api/schools/deletion',
  'DELETE /api/schools/deletion',
  'POST   /api/internal/deletions/purge'
]);

doc.subheading('Expected status codes');
doc.bullet('Member request created: HTTP 201.');
doc.bullet('Duplicate open request: HTTP 409.');
doc.bullet('Owner personal deletion request: HTTP 409.');
doc.bullet('Locked account or school access: HTTP 403.');
doc.bullet('Approve, reject, or cancel: HTTP 200.');
doc.bullet('Missing or incorrect purge secret: HTTP 401.');
doc.bullet('Successful purge: HTTP 200 with processed count and results.');

doc.subheading('Protected purge request');
doc.code([
  'POST /api/internal/deletions/purge',
  'Authorization: Bearer <DELETION_PURGE_SECRET>',
  'Content-Type: application/json',
  '',
  '{}'
]);

doc.subheading('Manual GitHub Actions run');
doc.bullet('Open the repository Actions tab and select Purge Scheduled Account Deletions.');
doc.bullet('Click Run workflow and choose the branch containing the workflow.');
doc.bullet('A successful run returns {"success":true,"processed":0,"results":[]} when nothing is due.');
doc.bullet('The workflow is configured for hourly runs at minute 0 UTC.');
doc.bullet('Scheduled runs require the workflow to exist on the default branch.');

doc.heading('Simulation checklist');
doc.bullet('Use a test school with disposable owner, coach, student, and guardian accounts.');
doc.bullet('Confirm the member request appears for staff in the correct tenant only.');
doc.bullet('Confirm approved accounts are locked but can still cancel.');
doc.bullet('Confirm a cancelled request does not purge.');
doc.bullet('Confirm school deletion blocks all four personas immediately.');
doc.bullet('Confirm a completed user purge retains ledger entries.');
doc.bullet('Confirm a completed school purge retains the tombstone and ledger anchor.');
doc.bullet('Check application logs for lockout, approval, cancellation, and purge events.');

doc.callout(
  'FINAL REMINDER',
  'The safest production test is request, approval, and cancellation without allowing the schedule to expire. Only run the purge against disposable accounts. The immutable ledger is intentionally retained in every deletion path.',
  'success'
);

const outputPath = path.resolve(__dirname, '../docs/account-deletion-simulation-examples.pdf');
fs.writeFileSync(outputPath, doc.finish());
console.log(`[BELTTRACK] Account deletion simulation PDF generated at: ${outputPath}`);
