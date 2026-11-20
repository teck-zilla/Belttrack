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
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/[^\x20-\x7E]/g, '')
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

    this.text('BELTTRACK LAUNCH READINESS AUDIT', MARGIN, PAGE_HEIGHT - 30, 9, 'F2', COLORS.primary);
    this.text('Static Scan + Local Verification', PAGE_WIDTH - MARGIN - 158, PAGE_HEIGHT - 30, 8, 'F1', COLORS.muted);
    this.text('Implemented features, verified capabilities, and launch-affecting gaps', MARGIN, PAGE_HEIGHT - 43, 7.5, 'F1', COLORS.muted);
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
      page.streams.push(`(BeltTrack Launch Readiness Audit  |  Page ${index + 1} of ${totalPages}) Tj`);
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

doc.text('BeltTrack Launch Readiness Audit', MARGIN, doc.y, 22, 'F2', COLORS.primary);
doc.y -= 20;
doc.text('Implemented features, verified capabilities, and launch-affecting gaps', MARGIN, doc.y, 11, 'F1', COLORS.accent);
doc.y -= 24;

doc.labelValue('Document date:', '19 November 2026');
doc.labelValue('Repository:', 'https://github.com/teck-zilla/Belttrack.git');
doc.labelValue('Branch:', 'second-branch');
doc.labelValue('HEAD:', '708bc7c feat(phase3): harden production security and verification');
doc.labelValue('Method:', 'Static repository scan plus latest local verification results');
doc.y -= 4;

doc.callout(
  'SCOPE NOTICE',
  'This document reflects the repository state on second-branch at the cited commit. No deployed environment, live database, SMTP provider, Upstash account, or GitHub repository setting was inspected. No secret value is reproduced in this PDF.',
  'accent'
);

doc.heading('Verification Summary');
doc.paragraph('The latest local verification results were:');
doc.code([
  'npm run audit                         0 hardcoded color violations',
  'npx tsc --noEmit --incremental false   clean',
  'npm run lint                           clean',
  'npm test                               32/32 pass',
  'npx next build                         pass',
  'npm run test:e2e                       2 passed, 1 env-gated skip'
]);
doc.paragraph(
  'The two passing e2e tests mock registration and join API responses. The staff lifecycle test is skipped unless E2E_STAFF_STORAGE_STATE, E2E_PROFILE_ID, and E2E_TECHNIQUE_ID are provided.',
  { size: 9.2 }
);

doc.heading('1. Implemented and Working Locally');
doc.paragraph(
  'The items below are implemented in source and covered by local checks where noted. Demo-only or simulated states are identified explicitly.'
);

doc.subheading('Product and UI');
doc.bullet('Next.js App Router shell, providers, metadata, and dynamic title: src/app/layout.tsx:1, src/components/layout/dynamic-title.tsx:1.');
doc.bullet('Top nav with tenant banner, role switcher, directory action, and sign-in/out states: src/components/layout/top-nav.tsx:1.');
doc.bullet('Demo/Real session banner and preview/live split: src/app/page.tsx:520.');
doc.bullet('Hero, role cards, registration, join, login, terms, and directory modals: src/components/home/hero-section.tsx:1, role-entry-cards.tsx:1, student-join-modal.tsx:1, login-modal.tsx:1.');
doc.bullet('Role-aware dashboard with rank progress, check-in, inactivity risk, and ledger summaries: src/components/home/preview-dashboard.tsx:1.');
doc.bullet('Technique curriculum and staff sign-off UI: src/components/home/technique-curriculum-modal.tsx:1.');
doc.bullet('Manual ledger entry, approvals, account/school deletion modals: manual-ledger-modal.tsx:1, member-approval-modal.tsx:1, account-deletion-modal.tsx:1.');
doc.bullet('Accessible modal focus trapping and Escape handling: src/components/home/use-accessible-modal.ts:1.');
doc.bullet('Standalone static preview files exist: index.html, index.css, app.js, server.js.');

doc.subheading('Auth, Tenancy, and Data');
doc.bullet('Supabase SSR, browser, and admin clients: src/lib/supabase/client.ts, server.ts, admin.ts.');
doc.bullet('Auth context, tenant context, session and role switching: src/context/auth-context.tsx:1, src/context/tenant-context.tsx:1.');
doc.bullet('Fail-closed guards deriving tenant from DB user: src/lib/auth-guard.ts:1.');
doc.bullet('Prisma tenant extension and scoped transactions with RLS context vars: src/lib/prisma-extension.ts:19, :132.');
doc.bullet('Multi-tenant schema with enums, indexes, and 14 tenant models including AuditLog: prisma/schema.prisma:11, :86, :358.');
doc.bullet('RLS policy source for tenant tables, ledger immutability, and append-only audit: prisma/rls_policies.sql:12, :191, :250.');
doc.bullet('Migrations for init, verification codes, persistence/idempotency, deletion lifecycle, and audit log: prisma/migrations/**.');

doc.subheading('API and Domain Operations');
doc.bullet('Register school, join with code, login/logout/me, verification/resend/reset flows.');
doc.bullet('Tenant-scoped approvals and pending-account gating: src/app/api/schools/approvals/route.ts:7.');
doc.bullet('Dashboard aggregation, attendance with idempotency, and inactivity alerts: src/app/api/dashboard/route.ts, src/app/api/attendance/route.ts:25.');
doc.bullet('Technique read and staff sign-off: src/app/api/techniques/route.ts, src/app/api/techniques/verify/route.ts:7.');
doc.bullet('Ledger write with receipt numbering and reversal validation: src/app/api/ledger/route.ts:8.');
doc.bullet('Public directory restricted to name, slug, city, and discipline: src/app/api/schools/directory/route.ts:6.');
doc.bullet('Account/school deletion lifecycle and protected internal purge: src/app/api/internal/deletions/purge/route.ts:12.');

doc.subheading('Security and Quality');
doc.bullet('Upstash rate limiting and Vercel-aware proxy IP extraction: src/lib/rate-limit.ts:38, :125, :326.');
doc.bullet('Same-origin CSRF enforcement with internal bearer exemption: src/lib/csrf.ts:12, src/proxy.ts:40.');
doc.bullet('Security headers and production HSTS in next.config.mjs; nonce-based per-request CSP enforced in src/proxy.ts.');
doc.bullet('Append-only audit writes for approvals, ledger, and deletion/staff actions: src/lib/audit-log.ts:17, approvals route :132, ledger route :108, deletion routes, and internal purge.');
doc.bullet('Zod unit tests, tenant-isolation and guardian/attendance static tests, and Playwright lifecycle tests: tests/**, playwright.config.ts:1.');
doc.bullet('Token pipeline and zero color violations: build-tokens.js:4, audit.js:19.');

doc.heading('2. Launch-Affecting Gaps');
doc.subheading('Blockers / High Risk');

doc.callout(
  '1. SMTP CREDENTIAL EXPOSURE - LOCAL REMOVAL DONE',
  'The embedded Google App Password value was removed from scripts/generate-vercel-env-pdf.mjs, docs/email-verification-system.md, and the regenerated docs/vercel-environment-variables.pdf. The credential must still be rotated externally because Git history contains the old value; no value is reproduced here.',
  'warning'
);

doc.bullet('RESOLVED: SMTP verification fails closed: src/lib/email-verification.ts returns false when SMTP is missing or delivery fails, invalidates undelivered codes, and registration/resend/reset routes return 503. SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, and SMTP_FROM are documented in .env.example and docs/environment-checklist.md.');
doc.bullet('RLS is not fully migration-enforced: detailed RLS lives in prisma/rls_policies.sql, migrations only include partial policies, and VerificationCode has no RLS policy at all. Full RLS must be applied manually before launch.');
doc.bullet('RESOLVED: boot validation now enforces all production runtime secrets and config in src/lib/env-validation.ts, rejects placeholders/weak secrets, and production HMAC/session helpers no longer use hardcoded fallback secrets.');
doc.bullet('RESOLVED: approving a minor student now approves pending GuardianStudent links, activates linked guardian accounts, and writes GUARDIAN_LINK_APPROVED audit entries: src/app/api/schools/approvals/route.ts.');
doc.bullet('RESOLVED: attendance is staff-only, the attendedAt value is server-generated, and the client timestamp field was removed from the Zod schema: src/app/api/attendance/route.ts and src/lib/validation/schemas.ts.');
doc.bullet('RESOLVED: client-side fallback sessions were removed, session/approval failures fail closed in real sessions, and approvals only update local state after server confirmation: src/context/auth-context.tsx and src/context/tenant-context.tsx.');
doc.bullet('RESOLVED: scheduled purge is active on main: .github/workflows/purge-deletions.yml:1 is on the default branch, APP_BASE_URL is set to https://belttrack.vercel.app, DELETION_PURGE_SECRET is set, and scheduled runs on main are succeeding.');
doc.bullet('E2E is partially mocked and gated: registration/join tests mock APIs at tests/e2e/lifecycle.spec.ts:10; the live DB lifecycle skips without E2E_STAFF_STORAGE_STATE, E2E_PROFILE_ID, and E2E_TECHNIQUE_ID.');
doc.bullet('RESOLVED: owner-only join-code rotation/revocation API added at /api/schools/join-code with validation and audit logging; rank/technique CRUD routes remain out of scope if not required for current launch flow.');
doc.bullet('RESOLVED: deletion lifecycle and staff deletion review routes now append audit events, and the internal purge route records completion/failure audit entries.');

doc.subheading('Non-blocking but Should Fix');
doc.bullet('RESOLVED: auth callbacks ignore forwarded hosts, validate next as a local path, and prefer NEXT_PUBLIC_SITE_URL or VERCEL_URL over the request origin: src/lib/auth-redirect.ts and src/app/api/auth/callback/route.ts.');
doc.bullet('RESOLVED: CSP is nonce-based per request in src/proxy.ts with no unsafe-inline scripts/styles (dev retains unsafe-eval for tooling); static CSP removed from next.config.mjs.');
doc.bullet('RESOLVED: .github/workflows/ci.yml runs audit, lint, type-check, unit/static tests, and production build on pushes and pull requests to main and second-branch.');
doc.bullet('student.cookies remains untracked and not ignored.');
doc.bullet('Docs drift reduced: README now references src/proxy.ts; roadmap still lists unimplemented multi-membership/subdomain phases and stale fixes.md/PDF docs may contradict current code.');
doc.bullet('Audit scope is color-only, not all hardcoded styling values.');
doc.bullet('RESOLVED: package.json now declares private=true and a Node >=20.9.0 engine requirement.');

doc.heading('3. Recommended Launch Sequence');
doc.bullet('Rotate the exposed SMTP credential externally and decide whether to rewrite Git history; local tracked files and regenerated PDFs no longer contain the value.');
doc.bullet('Keep SMTP settings configured in every deployment environment and monitor delivery failures; registration now returns 503 when outbound email is unavailable.');
doc.bullet('Apply the full RLS file to the deployment database and add RLS for VerificationCode; verify with a cross-tenant test.');
doc.bullet('Keep production deployment secrets populated and monitor boot validation errors; never add fallback secrets back to HMAC or session helpers.');
doc.bullet('Keep guardian link approval, staff-only attendance, and deletion audit writes protected by regression tests and verify them against a real tenant in staging.');
doc.bullet('Keep owner join-code rotation/revocation protected and add curriculum/belt CRUD only if required for launch scope.');
doc.bullet('Keep the already-configured purge workflow on main and monitor scheduled runs.');
doc.bullet('Replace mocked/gated e2e coverage with staged real-flow coverage; CI now gates audit, lint, type-check, unit/static tests, and build.');

doc.heading('Assumptions');
doc.bullet('This PDF is based on a static repository scan and the latest local verification results; no deployed environment or external provider state was inspected.');
doc.bullet('Implemented means source code and checks exist locally; it does not guarantee production behavior without configured secrets, applied migrations/RLS, and live integration tests.');
doc.bullet('No secret values were read for inclusion or reproduced in this PDF.');
doc.bullet('The explicit out-of-scope MVP items remain excluded from launch-gap analysis.');

const outputPath = path.resolve(__dirname, '../docs/launch-readiness-audit.pdf');
fs.writeFileSync(outputPath, doc.finish());
console.log(`[BELTTRACK] Launch readiness audit PDF generated at: ${outputPath}`);
