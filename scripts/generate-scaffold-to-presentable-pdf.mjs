/**
 * BeltTrack Roadmap PDF Generator
 *
 * Generates docs/scaffold-to-presentable-roadmap.pdf documenting the
 * prioritized path from the current auth-scaffolding + interactive-preview
 * stage to a presentable, demo-safe application.
 *
 * Follows the same dependency-free raw PDF construction used by
 * scripts/generate-contrast-pdf.mjs (no external PDF packages).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLOR_NAVY = [0.106, 0.165, 0.29];
const COLOR_TEXT = [0.10, 0.12, 0.18];
const COLOR_MUTED = [0.45, 0.48, 0.55];
const COLOR_CALLOUT_BG = [0.96, 0.97, 0.99];
const COLOR_CALLOUT_BORDER = [0.82, 0.86, 0.94];
const COLOR_RULE = [0.85, 0.87, 0.90];

class PdfDoc {
  constructor(width = 612, height = 792) {
    this.width = width;
    this.height = height;
    this.pages = [];
    this.page = null;
    this.y = 0;
    this.marginX = 54;
    this.rightX = width - 54;
  }

  static escapeText(str) {
    return String(str)
      .replace(/[^\x20-\x7E]/g, '?')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  static charWidth(ch) {
    if (ch === ' ') return 0.28;
    if (/[A-Z0-9]/.test(ch)) return 0.62;
    if (/[a-z]/.test(ch)) return 0.5;
    if (/[.,:;'!|]/.test(ch)) return 0.28;
    if (/[-_/\\()[\]]/.test(ch)) return 0.33;
    return 0.5;
  }

  static textWidth(str, size) {
    let units = 0;
    for (const ch of String(str)) units += PdfDoc.charWidth(ch);
    return units * size;
  }

  wrap(text, maxWidth, size) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (PdfDoc.textWidth(candidate, size) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  startPage() {
    const page = { streams: [] };
    this.pages.push(page);
    this.page = page;
    this.y = this.height - 68;

    const s = page.streams;

    s.push('1 1 1 rg');
    s.push(`0 0 ${this.width} ${this.height} re f`);

    s.push(`${COLOR_NAVY[0]} ${COLOR_NAVY[1]} ${COLOR_NAVY[2]} rg`);
    s.push(`0 ${this.height - 12} ${this.width} 12 re f`);

    this.addText(54, this.height - 34, 9, 2, COLOR_NAVY, 'BELTTRACK');
    this.addText(
      54 + PdfDoc.textWidth('BELTTRACK', 9) + 10,
      this.height - 34,
      9,
      1,
      COLOR_MUTED,
      'Martial Arts School Management Platform'
    );

    const rightLabel = 'SCAFFOLDING -> PRESENTABLE ROADMAP';
    this.addText(
      this.rightX - PdfDoc.textWidth(rightLabel, 7.5),
      this.height - 34,
      7.5,
      1,
      COLOR_MUTED,
      rightLabel
    );

    s.push(`${COLOR_RULE[0]} ${COLOR_RULE[1]} ${COLOR_RULE[2]} RG`);
    s.push('0.7 w');
    s.push(`54 ${this.height - 44} m ${this.rightX} ${this.height - 44} l s`);

    this.y = this.height - 74;
  }

  addText(x, y, size, font, rgb, str) {
    const s = this.page.streams;
    s.push('BT');
    s.push(`/F${font} ${size} Tf`);
    s.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg`);
    s.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    s.push(`(${PdfDoc.escapeText(str)}) Tj`);
    s.push('ET');
  }

  ensureSpace(required) {
    if (this.y - required < 76) {
      this.startPage();
    }
  }

  spacer(h = 8) {
    this.y -= h;
  }

  h1(text) {
    this.ensureSpace(30);
    this.addText(this.marginX, this.y, 15, 2, COLOR_NAVY, text);
    this.y -= 22;
  }

  h2(text) {
    this.ensureSpace(34);
    this.spacer(4);

    const s = this.page.streams;
    s.push(`${COLOR_NAVY[0]} ${COLOR_NAVY[1]} ${COLOR_NAVY[2]} rg`);
    s.push(`${this.marginX} ${this.y - 3} 4 15 re f`);

    this.addText(this.marginX + 12, this.y, 12, 2, COLOR_NAVY, text);
    this.y -= 20;
  }

  h3(text) {
    this.ensureSpace(24);
    this.addText(this.marginX, this.y, 10, 2, COLOR_NAVY, text);
    this.y -= 16;
  }

  p(text, opts = {}) {
    const size = opts.size || 9.5;
    const lh = opts.lh || 13;
    const x = opts.x || this.marginX;
    const maxWidth = (opts.maxWidth || this.rightX - x);
    const rgb = opts.rgb || COLOR_TEXT;
    const font = opts.font || 1;
    const lines = this.wrap(text, maxWidth, size);

    this.ensureSpace(lines.length * lh);
    for (const line of lines) {
      this.addText(x, this.y, size, font, rgb, line);
      this.y -= lh;
    }
  }

  bullet(text) {
    const size = 9;
    const lh = 12.5;
    const indent = 12;
    const x = this.marginX + indent;
    const lines = this.wrap(text, this.rightX - x, size);

    this.ensureSpace(lines.length * lh);
    this.addText(this.marginX + 1, this.y, size, 1, COLOR_NAVY, '-');
    for (const line of lines) {
      this.addText(x, this.y, size, 1, COLOR_TEXT, line);
      this.y -= lh;
    }
    this.y -= 4;
  }

  callout(title, text) {
    const size = 9;
    const lh = 12.5;
    const innerX = this.marginX + 16;
    const innerWidth = this.rightX - innerX - 16;
    const lines = this.wrap(text, innerWidth, size);
    const boxHeight = lines.length * lh + 30;

    this.ensureSpace(boxHeight + 8);
    this.spacer(2);

    const s = this.page.streams;
    s.push(`${COLOR_CALLOUT_BG[0]} ${COLOR_CALLOUT_BG[1]} ${COLOR_CALLOUT_BG[2]} rg`);
    s.push(`${COLOR_CALLOUT_BORDER[0]} ${COLOR_CALLOUT_BORDER[1]} ${COLOR_CALLOUT_BORDER[2]} RG`);
    s.push('0.8 w');
    s.push(`${this.marginX} ${this.y - boxHeight + 18} ${this.rightX - this.marginX} ${boxHeight} re B`);

    this.addText(innerX, this.y + 2, 8.5, 2, COLOR_NAVY, title);
    let ly = this.y - 12;
    for (const line of lines) {
      this.addText(innerX, ly, size, 1, COLOR_TEXT, line);
      ly -= lh;
    }
    this.y -= boxHeight + 8;
  }

  build() {
    const totalPages = this.pages.length;

    for (let i = 0; i < this.pages.length; i++) {
      const s = this.pages[i].streams;
      s.push(`${COLOR_RULE[0]} ${COLOR_RULE[1]} ${COLOR_RULE[2]} RG`);
      s.push('0.6 w');
      s.push(`54 54 m ${this.rightX} 54 l s`);

      this.page = this.pages[i];
      this.addText(
        54,
        40,
        7.5,
        1,
        COLOR_MUTED,
        'BeltTrack - Roadmap: Auth Scaffolding to Presentable  |  Planning Document  |  Local-only until approved'
      );
      const pageLabel = `Page ${i + 1} of ${totalPages}`;
      this.addText(
        this.rightX - PdfDoc.textWidth(pageLabel, 7.5),
        40,
        7.5,
        2,
        COLOR_NAVY,
        pageLabel
      );
    }

    const objects = [];
    let objCount = 0;

    const catalogId = 1;
    const pagesRootId = 2;
    const f1Id = 3;
    const f2Id = 4;
    const f3Id = 5;

    objects.push({ id: f1Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' });
    objects.push({ id: f2Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>' });
    objects.push({ id: f3Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>' });
    objCount = 5;

    const pageObjIds = [];

    for (const page of this.pages) {
      const streamContent = page.streams.join('\n');
      const streamBuffer = Buffer.from(streamContent, 'utf8');

      objCount++;
      const contentId = objCount;
      objects.push({
        id: contentId,
        content: `<< /Length ${streamBuffer.length} >>\nstream\n${streamContent}\nendstream`
      });

      objCount++;
      const pageId = objCount;
      pageObjIds.push(pageId);
      objects.push({
        id: pageId,
        content: `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${f1Id} 0 R /F2 ${f2Id} 0 R /F3 ${f3Id} 0 R >> >> /Contents ${contentId} 0 R >>`
      });
    }

    const catalogObj = { id: catalogId, content: `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>` };
    const pagesRootObj = { id: pagesRootId, content: `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>` };

    const allObjects = [catalogObj, pagesRootObj, ...objects];
    allObjects.sort((a, b) => a.id - b.id);

    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];

    for (const obj of allObjects) {
      offsets.push(Buffer.byteLength(pdf, 'binary'));
      pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    }

    const startXref = Buffer.byteLength(pdf, 'binary');
    pdf += `xref\n0 ${allObjects.length + 1}\n0000000000 65535 f \n`;

    for (const offset of offsets) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${allObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(pdf, 'binary');
  }
}

function buildReport(doc) {
  doc.h1('Roadmap: Auth Scaffolding to Presentable');
  doc.p(
    'Prioritized execution plan to move BeltTrack from its current auth-scaffolding and interactive-preview stage to a demo-safe, presentable application.',
    { size: 9.5, rgb: COLOR_MUTED, font: 3 }
  );
  doc.spacer(4);
  doc.p('Scope: current working tree at commit 19de146  |  Audit date: November 2026  |  Status: Planning (no files changed)');
  doc.spacer(6);

  doc.h2('Definition of Presentable');
  doc.p(
    'Presentable means safe to demonstrate to a real dojo owner: core workflows persist to the database, tenant boundaries are enforced server-side, and there are no exploitable or fake-success paths. It does not require full production launch.'
  );
  doc.spacer(4);

  doc.h2('Current Verification Snapshot');
  doc.bullet('npm run audit: PASS - 45 files, 0 hardcoded color violations.');
  doc.bullet('npx tsc --noEmit: PASS - no type errors.');
  doc.bullet('npm run build: PASS - 15 routes compiled, with warnings (React 18 deprecated in Next 16, middleware convention deprecated, Turbopack root warning).');
  doc.bullet('Functional rating: 6/10 overall; 8/10 as an interactive demo; 3.5/10 as a production multi-tenant system.');
  doc.bullet('Core domain features (attendance, technique sign-off, ledger, inactivity alerts) are UI-only and not persisted. RLS is documented but not enforced.');

  doc.h2('Phase 0 - Security Blockers (must do first, ~1-2 days)');
  doc.bullet('Remove the hardcoded fallback password and all managed-auth-preview writes: login/route.ts:125, register/route.ts:157, join/route.ts:128,161, reset-password/route.ts:186. Fail closed with HTTP 503 when Supabase is unconfigured.');
  doc.bullet('Authorize the approvals route: require a session, verify OWNER or COACH, and derive schoolId from the DB user. Never trust a request body schoolId (approvals/route.ts:5-16, 69-117).');
  doc.bullet('Reduce the public directory to PRD fields only: name, slug, city, discipline. Remove joinCode and id (directory/route.ts:10-17).');
  doc.bullet('Fix the reset flow: remove the targetEmail echo, return generic responses, enforce the 15-128 character policy, and add strict per-email and per-IP limits (reset-password/route.ts:106-141).');
  doc.bullet('Add a server-side route guard and block PENDING_APPROVAL accounts from rosters, techniques, and the dashboard.');
  doc.bullet('Move verification and password-reset codes into PostgreSQL: hashed code, expiry, attempt counter, used flag, single-use. In-memory maps cannot work on serverless (email-verification.ts:29-34).');
  doc.bullet('Rotate Supabase service-role and SMTP credentials, confirm .env is not in git history, and add boot-time environment validation.');

  doc.h2('Phase 1 - Make the Demo Honest (persistence, ~3-5 days)');
  doc.bullet('Wire tenant enforcement with a withTenantContext helper that sets app.current_school_id and app.current_user_id, or implement a real Prisma $extends. Ship rls_policies.sql as a migration (fixes.md Steps 3-4).');
  doc.bullet('Attendance: add POST /api/attendance and persist dashboard check-ins. Coach-only, idempotency key, no backdating.');
  doc.bullet('Technique sign-off: add POST /api/techniques/verify with a server role check and persist TechniqueProgress.');
  doc.bullet('Ledger: add POST /api/ledger with a server-generated REC-YYYY-DISCIPLINE-N slug, append-only rows, and offsetting reversal entries (manual-ledger-modal.tsx:125-142).');
  doc.bullet('Inactivity alerts: run a real query for 10 or more absent days and remove the hardcoded Elena Rostova / 13 days block (preview-dashboard.tsx:686-693).');
  doc.bullet('Derive rank metrics (classes, days-in-rank, techniques) from the database per tenant. Keep 42/50, 142/120, and 8/10 only for the demo tenant.');
  doc.bullet('Persist country, drop or properly collect date of birth, and validate that guardian and student belong to the same tenant (join/route.ts:141-154).');

  doc.h2('Phase 2 - Presentability Polish (~2-3 days)');
  doc.bullet('Split Demo and Real modes with a visible banner. Remove simulated success toasts and fake data whenever a real session is active.');
  doc.bullet('Add a deterministic seed script for the demo tenant: school, belt ladder, techniques, class schedules, students, and ledger entries.');
  doc.bullet('Close UX gaps: loading, empty, and error states; mobile pass; no raw error.message in 500 responses.');
  doc.bullet('Housekeeping: move the inline head metadata into metadata exports (page.tsx:516-521), install ESLint and make npm run lint actually lint, and strip PII and session console logs.');
  doc.bullet('Upgrade to React 19, migrate middleware.ts to proxy, and set turbopack.root to remove build warnings.');

  doc.h2('Phase 3 - Production Hardening (if presentable means launchable)');
  doc.bullet('Replace the in-memory rate limiter with Redis or Upstash (requires package approval) and configure trusted proxy IP extraction.');
  doc.bullet('Add tests: Zod schema units, tenant-isolation integration tests, and e2e coverage for register -> join -> approve -> attendance -> sign-off -> ledger.');
  doc.bullet('Add security headers and CSP, CSRF tokens or strict same-origin enforcement, and an audit log for approvals and ledger mutations.');
  doc.bullet('Update the README to reflect actual status and add a deploy runbook plus environment checklist.');

  doc.callout(
    'MINIMUM VIABLE PRESENTABLE SLICE',
    'Ship Phase 0 plus one vertical slice (attendance + technique sign-off + ledger for a single real tenant) plus the demo seed and an honest demo banner. This converts the app from a mock dashboard into a credible working product without building everything.'
  );

  doc.h2('Suggested Order');
  doc.p('0 -> 8 -> 9/10/11 (vertical slice) -> 15/16 -> 12/13/14 -> 18/19 -> Phase 3 hardening.');

  doc.h2('Acceptance Gates Per Phase');
  doc.bullet('npm run audit reports 0 violations.');
  doc.bullet('npx tsc --noEmit is clean.');
  doc.bullet('npm run build is clean (no new warnings).');
  doc.bullet('Manual tenant-isolation test passes with two separate schools.');

  doc.h2('Assumptions');
  doc.bullet('Work is local only; no migrations, pushes, or commits without explicit instruction (AGENTS.md).');
  doc.bullet('Adding Redis or a test framework requires user approval first.');
  doc.bullet('Presentable targets a stakeholder or dojo-owner demo, not an open production launch.');
  doc.bullet('Estimates assume one developer familiar with the codebase.');
  doc.bullet('This document is a plan only; no application files were changed.');
}

const doc = new PdfDoc(612, 792);
doc.startPage();
buildReport(doc);

const outputPath = path.resolve(__dirname, '../docs/scaffold-to-presentable-roadmap.pdf');
fs.writeFileSync(outputPath, doc.build());
console.log(`[BELTTRACK DOCS] PDF successfully generated at: ${outputPath}`);
