#!/usr/bin/env node
/**
 * scripts/generate-user-guide-pdf.mjs
 * 
 * Generates docs/live-testing-and-user-guide.pdf
 * A complete, illustrated testing and user manual for BeltTrack on Vercel.
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

    this.text('BELTTRACK LIVE TESTING & USER MANUAL', MARGIN, PAGE_HEIGHT - 30, 8.5, 'F2', COLORS.primary);
    this.text('Step-by-Step Testing Guide for Web Users', PAGE_WIDTH - MARGIN - 160, PAGE_HEIGHT - 30, 8, 'F1', COLORS.muted);
    this.text('Production User Guide for https://belttrack.vercel.app', MARGIN, PAGE_HEIGHT - 43, 7.5, 'F1', COLORS.muted);
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
      page.streams.push(`(BeltTrack Live Testing & User Manual  |  Page ${index + 1} of ${totalPages}) Tj`);
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
doc.text('BeltTrack Live Testing & User Guide', MARGIN, doc.y, 18, 'F2', COLORS.primary);
doc.y -= 18;
doc.text('Step-by-Step Manual for Testing School Registration, Student Join, Sign In, and Core Workflows', MARGIN, doc.y, 9.8, 'F1', COLORS.accent);
doc.y -= 20;

doc.labelValue('Document Date:', '26 November 2026');
doc.labelValue('Application URL:', 'https://belttrack.vercel.app');
doc.labelValue('Audience:', 'Testers, Dojo Owners, Coaches, Students, and Guardians');
doc.labelValue('Scope:', 'End-to-End browser walkthrough for live production evaluation');
doc.y -= 4;

doc.callout(
  'HOW TO TEST BELTTRACK TODAY',
  'BeltTrack is accessible directly from your desktop or mobile browser. You can explore the platform immediately using the zero-account Demo Persona Preview mode, or create a live academy/student account to experience real-time roll-call attendance, technique sign-off, immutable tuition ledgering, and in-modal password recovery.',
  'accent'
);

doc.heading('1. Interactive Demo Mode (No Account Required)');
doc.paragraph('Visitors who want to explore BeltTrack without registering can use the built-in Persona Preview Simulator:');
doc.bullet('Open https://belttrack.vercel.app in any web browser.');
doc.bullet('Notice the Persona Switcher pill in the top navigation bar.');
doc.bullet('Toggle between Dojo Owner, Coach, Student, and Guardian.');
doc.bullet('Review the interactive White-to-Blue Belt Rank progress tracker (42/50 classes attended, 142/120 minimum days in rank, 8/10 verified techniques).');
doc.bullet('Click "+ Check In" to trigger an interactive attendance simulation toast.');
doc.bullet('Inspect the roll-call schedule, inactive student risk indicators, and zero-monetization immutable tuition receipt ledger.');

doc.heading('2. Real Sign-Up Workflows (Live Database Onboarding)');

doc.subheading('Workflow A: Register a New Academy (Dojo Owner / Head Coach)');
doc.paragraph('To create an entirely new martial arts academy tenant:');
doc.bullet('Step 1: Click "Register Academy" on the home screen hero card, or click "Sign In" -> "Register School".');
doc.bullet('Step 2: Enter School / Academy Name (min 3 characters, e.g. "Kaizen Jiu-Jitsu").');
doc.bullet('Step 3: Select Discipline (Brazilian Jiu-Jitsu, Judo, Karate, Taekwondo, Muay Thai, Krav Maga).');
doc.bullet('Step 4: Enter Head Coach Full Name (at least 2 words, e.g. "Marcus Almeida") and Owner Email Address.');
doc.bullet('Step 5: Enter City and Country.');
doc.bullet('Step 6: Choose a strong password of at least 15 characters (e.g. "KaizenBJJ2026!MasterPass").');
doc.bullet('Step 7: (Optional) Enter a custom 4-16 alphanumeric join code (e.g. "KAIZEN-2026") or let the system auto-generate one.');
doc.bullet('Step 8: Click "Register Academy". A 6-digit confirmation code will be dispatched to the owner email.');
doc.bullet('Step 9: Enter the 6-digit code to verify your email and access your live school dashboard.');

doc.subheading('Workflow B: Join an Existing Academy (Student / Minor Onboarding)');
doc.paragraph('To enroll in an academy that has already been registered:');
doc.bullet('Step 1: Obtain the School Join Code from your Head Coach (e.g. "KAIZEN-2026").');
doc.bullet('Step 2: Click "Join with Code" on the home screen hero card.');
doc.bullet('Step 3: Enter the School Join Code.');
doc.bullet('Step 4: Enter Student Full Name, Student Email, and Date of Birth.');
doc.bullet('Step 5: If the student is a minor (under 18), check the Minor checkbox and provide Guardian Full Name and Email.');
doc.bullet('Step 6: Choose a strong password of at least 15 characters and submit.');
doc.bullet('Step 7: The account is provisioned in PENDING_APPROVAL status, protecting school curriculum until the coach signs off.');

doc.heading('3. Sign In & Session Management');
doc.paragraph('Once an account has been created:');
doc.bullet('Click "Sign In" in the top navigation bar.');
doc.bullet('Standard Sign In: Enter registered Email Address and Password.');
doc.bullet('Owner Join Code Sign In: Dojo owners can toggle to "Dojo Owner" mode and sign in using their School Join Code and Owner Password.');
doc.bullet('Live Tenant Shift: Upon successful login, the UI shifts from Demo Mode to "LIVE TENANT SESSION", displaying live database records.');
doc.bullet('In-Modal Password Reset: Click "Forgot password?" next to the password input, enter your email or school join code, check your inbox for the 6-digit OTP, and update your credentials without leaving the modal.');

doc.heading('4. Core Domain Operations for Authenticated Roles');
doc.bullet('Staff Roll-Call Attendance: Coaches can open the Attendance modal and record student check-ins in real time. Server timestamps prevent backdating, and idempotency keys prevent duplicate submissions.');
doc.bullet('Technique Curriculum Sign-Off: Staff can open the Technique Curriculum modal and verify student techniques required for belt promotions.');
doc.bullet('Zero-Monetization Tuition Ledger: Staff can record manual cash, bank transfer, and card payments with immutable receipt slugs (REC-YYYY-DISCIPLINE-N) and submit offsetting reversal entries for corrections.');
doc.bullet('Staff Member Approvals: Owners and coaches can inspect the pending approval queue and approve students, which automatically activates linked guardian accounts.');

doc.heading('5. Key Rules & Troubleshooting for Testers');
doc.bullet('15-Character Password Rule: Strict NIST-compliant password rules require 15+ characters. Passwords found in public data breach databases are rejected.');
doc.bullet('Real Email Required: Live SMTP email verification is enabled. Use an active email to receive 6-digit confirmation codes.');
doc.bullet('Browser Only: Automated CLI scripts without browser origin headers are blocked by same-origin CSRF protection.');

const outputPath = path.resolve(__dirname, '../docs/live-testing-and-user-guide.pdf');
fs.writeFileSync(outputPath, doc.finish());
console.log(`[BELTTRACK] User guide PDF successfully generated at: ${outputPath}`);
