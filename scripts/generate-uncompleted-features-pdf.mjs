#!/usr/bin/env node
/**
 * scripts/generate-uncompleted-features-pdf.mjs
 * 
 * Generates docs/uncompleted-features-and-next-actions.pdf
 * A comprehensive audit detailing uncompleted features, architectural gaps,
 * out-of-scope boundaries, and a prioritized next line of action.
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

    this.text('BELTTRACK UNCOMPLETED FEATURES & ACTION ROADMAP', MARGIN, PAGE_HEIGHT - 30, 8.5, 'F2', COLORS.primary);
    this.text('Architectural Gaps & Prioritized Next Actions', PAGE_WIDTH - MARGIN - 175, PAGE_HEIGHT - 30, 8, 'F1', COLORS.muted);
    this.text('Comparison of Roadmap Targets Against Current Implementation', MARGIN, PAGE_HEIGHT - 43, 7.5, 'F1', COLORS.muted);
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
    const size = options.size ?? 9.2;
    const font = options.font ?? 'F1';
    const color = options.color ?? COLORS.body;
    const lineHeight = options.lineHeight ?? 12.5;
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

  bullet(text, options = {}) {
    this.paragraph(text, { indent: 12, prefix: '- ', lineHeight: 12, size: 8.8, ...options });
  }

  code(lines) {
    const codeLines = Array.isArray(lines) ? lines : [lines];
    const height = 14 + codeLines.length * 10;
    this.ensureSpace(height + 6);
    this.panel(height);
    let lineY = this.y - 12;
    for (const line of codeLines) {
      this.text(line, MARGIN + 10, lineY, 7.8, 'F4', COLORS.body);
      lineY -= 10;
    }
    this.y -= height + 8;
  }

  heading(text) {
    this.ensureSpace(32);
    this.y -= 5;
    this.text(text.toUpperCase(), MARGIN, this.y, 10, 'F2', COLORS.primary);
    this.y -= 6;
    this.rule(this.y, COLORS.accent, 1.2);
    this.y -= 12;
  }

  subheading(text) {
    this.ensureSpace(22);
    this.text(text, MARGIN, this.y, 9.2, 'F2', COLORS.primary);
    this.y -= 11;
  }

  labelValue(label, value) {
    this.ensureSpace(13);
    this.text(label, MARGIN, this.y, 8.2, 'F2', COLORS.muted);
    this.text(value, MARGIN + 120, this.y, 8.2, 'F1', COLORS.body);
    this.y -= 11.5;
  }

  callout(title, text, tone = 'accent') {
    const color = tone === 'success' ? COLORS.success : tone === 'warning' ? COLORS.warning : COLORS.accent;
    const lines = this.wrap(text, CONTENT_WIDTH - 24, 8.5, 'F1');
    const height = 22 + lines.length * 11;

    this.ensureSpace(height + 6);
    this.panel(height);
    const [r, g, b] = hexToRgb(color);
    this.raw(`${r} ${g} ${b} RG`);
    this.raw('2 w');
    this.raw(`${MARGIN} ${this.y - height} m ${MARGIN} ${this.y} l s`);

    this.text(title, MARGIN + 12, this.y - 11, 8.2, 'F2', color);
    let lineY = this.y - 22;
    for (const line of lines) {
      this.text(line, MARGIN + 12, lineY, 8.5, 'F1', COLORS.body);
      lineY -= 11;
    }
    this.y -= height + 8;
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
      page.streams.push(`(BeltTrack Uncompleted Features & Action Roadmap  |  Page ${index + 1} of ${totalPages}) Tj`);
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

// Document Header
doc.text('BeltTrack Uncompleted Features & Action Roadmap', MARGIN, doc.y, 18, 'F2', COLORS.primary);
doc.y -= 18;
doc.text('Architectural Gaps, Future Sprint Deliverables, and Recommended Next Steps', MARGIN, doc.y, 10, 'F1', COLORS.accent);
doc.y -= 20;

doc.labelValue('Document Date:', 'November 2026');
doc.labelValue('Repository:', 'https://github.com/teck-zilla/Belttrack.git');
doc.labelValue('Branch / Baseline:', 'second-branch (Verified V2 Single-Tenant Baseline)');
doc.labelValue('Audit Focus:', 'Uncompleted Features from Roadmap & Launch Readiness Gaps');
doc.y -= 4;

doc.callout(
  'EXECUTIVE AUDIT SUMMARY',
  'BeltTrack V2 has successfully completed all baseline MVP transitions: Supabase SSR authentication, in-modal password reset, email verification, real PostgreSQL persistence across roll-call attendance, technique sign-off, immutable tuition ledger, inactivity alerts, and GDPR deletion lifecycles. This audit catalogues the remaining uncompleted capabilities (principally the multi-account architecture phases and production deployment requirements) and provides a concrete line of action.',
  'accent'
);

doc.heading('1. Uncompleted Features Matrix');
doc.paragraph('The following capabilities are catalogued as uncompleted or pending in relation to the PRD and the Recommended Roadmap in README.md:');

doc.code([
  'FEATURE / MILESTONE                   ROADMAP TARGET    CURRENT STATUS',
  '----------------------------------------------------------------------',
  '1. Multi-Membership Schema (SchoolMember)  Sprint 1 (P2)    UNCOMPLETED (Single schoolId)',
  '2. Active Tenant Cookie Context            Sprint 1 (P2)    UNCOMPLETED (No belttrack_active_school_id)',
  '3. Dynamic Top-Nav Academy Switcher UI     Sprint 2 (P3)    UNCOMPLETED (Static demo toggles)',
  '4. In-App "+ Join School with Code" Flow   Sprint 2 (P3)    UNCOMPLETED (Requires separate user)',
  '5. Guardian 1-Click Dependent Switcher     Sprint 3 (P4)    UNCOMPLETED (DB link exists, UI pending)',
  '6. Production Subdomain Routing (*.belttrack) Launch (P5)   UNCOMPLETED (Single-domain hosting)',
  '7. Dojo Owner Belt/Curriculum Customization Future Scope    UNCOMPLETED (Pre-seeded only)',
  '8. Live Staging Playwright E2E Test Suite   Launch Staging   GATED (Live staff test skips in CI)',
  '9. Full Database RLS Policy Application     Production DB    MANUAL STEP (Script exists, pending exec)'
]);

doc.heading('2. Detailed Gap Analysis');

doc.subheading('A. Multi-Account & Multi-Tenant Architecture (Roadmap Phases 2 - 5)');
doc.paragraph('Currently, the User model binds strictly to a single schoolId. This satisfies single-academy isolation but blocks cross-academy participation.');
doc.bullet('Multi-Membership Data Model (Roadmap Phase 2): A user with one email (e.g. coach@kaizenbjj.org) cannot currently join an affiliated academy as a student or guardian without creating a second account. Resolution requires introducing a SchoolMember join table (userId, schoolId, role, status, joinedAt) and decoupling User from single schoolId.');
doc.bullet('Active Tenant Cookie Context (Roadmap Phase 2): Currently, the tenant is fixed per user session. Next.js src/proxy.ts needs to parse a signed belttrack_active_school_id cookie, verify the user belongs to that school, and inject x-school-id into Server Component headers.');
doc.bullet('Dynamic Academy Switcher UI (Roadmap Phase 3): Top navigation currently displays a role simulator toggle for demo mode. It must be upgraded to a live dropdown listing all verified academy memberships with 1-click active tenant switching.');
doc.bullet('In-App "+ Join School with Code" (Roadmap Phase 3): Authenticated users currently cannot enter a second school join code to enroll in another academy; the join modal assumes unauthenticated self-registration.');
doc.bullet('Guardian Dependent Switching (Roadmap Phase 4): While GuardianStudent links exist in the database, the top navigation lacks 1-click toggling between parent and child profiles, and read-only views for dependents are not dynamically scoped.');
doc.bullet('Production Subdomain Routing (Roadmap Phase 5): Host-only cookie policies and wildcard subdomains (<school>.belttrack.com) are not yet configured; all tenants currently access the root domain.');

doc.subheading('B. Operational & Launch-Affecting Gaps');
doc.bullet('Database-Level Row-Level Security: prisma/rls_policies.sql contains complete RLS rules, but these must be executed manually via psql on Supabase. Furthermore, VerificationCode table currently lacks an RLS policy.');
doc.bullet('Vercel Production Environment Secrets: As documented in docs/vercel deployment issues, production boot validation fails closed unless UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, and real SMTP credentials are set.');
doc.bullet('Gated E2E Test Suite: Playwright registration and join tests currently run on mocked responses. The live staff lifecycle test automatically skips unless E2E_STAFF_STORAGE_STATE, E2E_PROFILE_ID, and E2E_TECHNIQUE_ID are supplied.');
doc.bullet('Curriculum Customization CRUD: Belt ranks and techniques are pre-seeded via demo scripts. Dojo owners cannot currently create custom belt ranks or add techniques through the UI.');

doc.heading('3. Intentionally Excluded Scope (PRD Non-MVP Boundaries)');
doc.paragraph('The following features were evaluated and confirmed as strictly out of scope for the MVP per PRD specifications:');
doc.bullet('External Payment Gateways: Excluded by design. BeltTrack operates with a zero-monetization core, recording only internal cash, bank transfer, and manual card receipts without external Stripe/payment processing.');
doc.bullet('Native Mobile Apps: Excluded. BeltTrack is built as a responsive web application optimized for desktop and mobile browsers via Next.js App Router.');
doc.bullet('Native Camera Barcode / QR Drivers: Excluded. Attendance roll-call relies on staff-verified interactive roster check-ins rather than camera drivers.');
doc.bullet('Third-Party Transactional SMS / Push Dispatch: Excluded. Notifications are limited to cryptographic SMTP email verification and in-modal notifications.');

doc.heading('4. Prioritized Next Line of Action');
doc.paragraph('To transition from the current verified baseline to full production deployment and multi-account capability, execute the following staged plan:');

doc.subheading('Priority 1: Immediate Launch Readiness (Production Staging)');
doc.bullet('1.1 Configure Upstash Redis: Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel production environment to pass boot validation.');
doc.bullet('1.2 Configure SMTP Delivery: Add live SMTP host, user, and password to Vercel to allow real email verification during user onboarding.');
doc.bullet('1.3 Apply PostgreSQL RLS: Run psql "$DIRECT_URL" -f prisma/rls_policies.sql on Supabase and add RLS policy for the VerificationCode table.');
doc.bullet('1.4 Clean Workspace: Remove untracked temporary files (student.cookies, local dev notes) from the repository.');
doc.bullet('1.5 Configure CI E2E Secrets: Supply staging credentials in GitHub repository secrets to enable un-gated live staff lifecycle E2E runs.');

doc.subheading('Priority 2: Multi-Membership Foundation (Sprint 1)');
doc.bullet('2.1 Prisma Schema Migration: Introduce model SchoolMember { id, userId, schoolId, role, status, joinedAt, ... } and deprecate single User.schoolId.');
doc.bullet('2.2 Proxy & Context Handling: Implement signed belttrack_active_school_id cookie validation in src/proxy.ts and synchronize with src/context/tenant-context.tsx.');
doc.bullet('2.3 Introspection Update: Update GET /api/auth/me to return active membership plus the array of all available school memberships.');

doc.subheading('Priority 3: Multi-Academy & Guardian UI (Sprint 2 & 3)');
doc.bullet('3.1 Navigation Switcher Dropdown: Replace demo persona toggles in src/components/layout/top-nav.tsx with a dynamic membership selector.');
doc.bullet('3.2 In-App Join Flow: Add a "+ Join Another Academy" button inside the switcher allowing logged-in users to redeem join codes without re-registering.');
doc.bullet('3.3 Guardian Dependent Toggle: Allow guardians to switch into linked dependent profiles with enforced read-only attendance and ledger views.');

doc.subheading('Priority 4: Subdomain Tenant Routing (Production Scale)');
doc.bullet('4.1 Wildcard DNS: Configure *.belttrack.com in DNS provider and bind to Vercel deployment.');
doc.bullet('4.2 Host Header Resolution: Extract subdomain slug in src/proxy.ts, lookup school, and enforce host-only cookie isolation for concurrent multi-school tabs.');

const outputPath = path.resolve(__dirname, '../docs/uncompleted-features-and-next-actions.pdf');
fs.writeFileSync(outputPath, doc.finish());
console.log(`[BELTTRACK] Uncompleted features PDF successfully generated at: ${outputPath}`);
