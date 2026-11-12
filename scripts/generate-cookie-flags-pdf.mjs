/**
 * BeltTrack Security Architecture - Cookie Flags PDF Generator
 * 
 * Generates docs/recommended-cookie-flags.pdf documenting the recommended
 * cookie security flags, threat mitigations, and code implementations for BeltTrack.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PdfBuilder {
  constructor(pageWidth = 612, pageHeight = 792) {
    this.width = pageWidth;
    this.height = pageHeight;
    this.pages = [];
  }

  addPage() {
    const page = { streams: [] };
    this.pages.push(page);
    return page;
  }

  static escapeText(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  static hexToRgb(hex) {
    const clean = hex.replace('#', '').slice(0, 6);
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
    ];
  }

  build() {
    const objects = [];
    let objCount = 0;

    const catalogId = 1;
    const pagesRootId = 2;

    const f1Id = 3; // Helvetica
    const f2Id = 4; // Helvetica-Bold
    const f3Id = 5; // Helvetica-Oblique
    const f4Id = 6; // Courier
    const f5Id = 7; // Courier-Bold
    objCount = 7;

    objects.push({ id: f1Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' });
    objects.push({ id: f2Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>' });
    objects.push({ id: f3Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>' });
    objects.push({ id: f4Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>' });
    objects.push({ id: f5Id, content: '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>' });

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
        content: `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${f1Id} 0 R /F2 ${f2Id} 0 R /F3 ${f3Id} 0 R /F4 ${f4Id} 0 R /F5 ${f5Id} 0 R >> >> /Contents ${contentId} 0 R >>`
      });
    }

    const catalogObj = { id: catalogId, content: `<< /Type /Catalog /Pages ${pagesRootId} 0 R >>` };
    const pagesRootObj = { id: pagesRootId, content: `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>` };

    const allObjects = [catalogObj, pagesRootObj, ...objects];
    allObjects.sort((a, b) => a.id - b.id);

    let pdf = '%PDF-1.4\n%âãÏÓ\n';
    const offsets = [];

    for (const obj of allObjects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
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

export function generateCookieFlagsReport(outputPath) {
  const doc = new PdfBuilder(612, 792); // Standard US Letter Portrait

  // Brand Colors
  const [navyR, navyG, navyB] = PdfBuilder.hexToRgb('#1b2a4a');
  const [blueR, blueG, blueB] = PdfBuilder.hexToRgb('#2563eb');
  const [lightBgR, lightBgG, lightBgB] = PdfBuilder.hexToRgb('#f4f3fb');
  const [borderR, borderG, borderB] = PdfBuilder.hexToRgb('#e2e2ea');
  const [darkTextR, darkTextG, darkTextB] = PdfBuilder.hexToRgb('#101115');
  const [mutedTextR, mutedTextG, mutedTextB] = PdfBuilder.hexToRgb('#5c5e6a');

  // ==========================================================================
  // PAGE 1: SPECIFICATION & THREAT MATRIX
  // ==========================================================================
  const p1 = doc.addPage();
  const s1 = p1.streams;

  // Background
  s1.push('1 1 1 rg');
  s1.push('0 0 612 792 re f');

  // Top Navy Brand Banner
  s1.push(`${navyR} ${navyG} ${navyB} rg`);
  s1.push('0 784 612 8 re f');

  // Header Titles
  s1.push('BT');
  s1.push('/F2 16 Tf');
  s1.push(`${navyR} ${navyG} ${navyB} rg`);
  s1.push('40 750 Td (BELTTRACK MARTIAL ARTS MANAGEMENT OS) Tj');
  s1.push('ET');

  s1.push('BT');
  s1.push('/F2 12 Tf');
  s1.push(`${blueR} ${blueG} ${blueB} rg`);
  s1.push('40 734 Td (Recommended Session Cookie Flags & Hardening Specifications) Tj');
  s1.push('ET');

  s1.push('BT');
  s1.push('/F1 8.5 Tf');
  s1.push(`${mutedTextR} ${mutedTextG} ${mutedTextB} rg`);
  s1.push('40 720 Td (Standards: OWASP Top 10 | Framework: Next.js 14+ App Router, @supabase/ssr, Prisma | Date: November 2026) Tj');
  s1.push('ET');

  // Divider
  s1.push(`${borderR} ${borderG} ${borderB} RG`);
  s1.push('0.75 w');
  s1.push('40 710 m 572 710 l S');

  // Section 1: Executive Purpose
  s1.push(`${lightBgR} ${lightBgG} ${lightBgB} rg`);
  s1.push('40 645 532 55 re f');
  s1.push(`${borderR} ${borderG} ${borderB} RG`);
  s1.push('40 645 532 55 re s');

  s1.push('BT');
  s1.push('/F2 9.5 Tf');
  s1.push(`${navyR} ${navyG} ${navyB} rg`);
  s1.push('50 684 Td (EXECUTIVE SUMMARY & MULTI-TENANT ISOLATION PRINCIPLE) Tj');
  s1.push('ET');

  s1.push('BT');
  s1.push('/F1 8 Tf');
  s1.push(`${darkTextR} ${darkTextG} ${darkTextB} rg`);
  s1.push('50 668 Td (BeltTrack is a multi-tenant operating system where dojo owners, coaches, students, and guardians access strictly) Tj');
  s1.push('50 656 Td (isolated academy rosters and ledgers. Robust cookie flags ensure authentication tokens cannot be leaked via XSS,) Tj');
  s1.push('50 644 Td (intercepted over public networks, or abused via cross-site request forgery \\(CSRF\\).) Tj');
  s1.push('ET');

  // Section 2: Recommended Cookie Flags Table
  s1.push('BT');
  s1.push('/F2 10.5 Tf');
  s1.push(`${navyR} ${navyG} ${navyB} rg`);
  s1.push('40 622 Td (1. RECOMMENDED COOKIE FLAGS SPECIFICATION) Tj');
  s1.push('ET');

  // Table Header
  const tableY = 602;
  s1.push(`${navyR} ${navyG} ${navyB} rg`);
  s1.push(`40 ${tableY} 532 18 re f`);

  s1.push('BT');
  s1.push('/F2 8 Tf');
  s1.push('1 1 1 rg');
  s1.push(`46 ${tableY + 5} Td (Cookie Flag) Tj`);
  s1.push(`120 ${tableY + 5} Td (Recommended Setting) Tj`);
  s1.push(`240 ${tableY + 5} Td (Severity) Tj`);
  s1.push(`290 ${tableY + 5} Td (Purpose & Threat Neutralized) Tj`);
  s1.push('ET');

  // Table Rows
  const flagRows = [
    {
      flag: 'HttpOnly',
      setting: 'true',
      severity: 'CRITICAL',
      sevColor: [0.73, 0.10, 0.10], // Red
      purpose: 'Blocks JavaScript (document.cookie) reads; prevents XSS token theft.'
    },
    {
      flag: 'Secure',
      setting: "NODE_ENV === 'prod'",
      severity: 'CRITICAL',
      sevColor: [0.73, 0.10, 0.10], // Red
      purpose: 'Restricts transmission strictly to encrypted HTTPS/TLS connections.'
    },
    {
      flag: 'SameSite',
      setting: "'Lax' (or 'Strict')",
      severity: 'HIGH',
      sevColor: [0.15, 0.39, 0.92], // Blue
      purpose: 'Prevents Cross-Site Request Forgery (CSRF) on background mutations.'
    },
    {
      flag: 'Path',
      setting: "'/'",
      severity: 'HIGH',
      sevColor: [0.15, 0.39, 0.92], // Blue
      purpose: 'Scopes token across all app routes (/api/schools, /api/auth, /app).'
    },
    {
      flag: 'Max-Age',
      setting: '604800 (7 Days)',
      severity: 'MEDIUM',
      sevColor: [0.87, 0.60, 0.06], // Amber
      purpose: 'Defines explicit rolling lifespan; cleared on logout / token refresh.'
    },
    {
      flag: 'Priority',
      setting: "'High'",
      severity: 'MEDIUM',
      sevColor: [0.87, 0.60, 0.06], // Amber
      purpose: 'Instructs Chromium browsers to prioritize preserving session in memory.'
    },
    {
      flag: 'Domain',
      setting: 'Omit (Host-Only)',
      severity: 'HIGH',
      sevColor: [0.15, 0.39, 0.92], // Blue
      purpose: 'Locks cookie to exact host; prevents cross-subdomain token leakage.'
    }
  ];

  let currentY = tableY - 24;
  flagRows.forEach((row, idx) => {
    // Zebra striping
    if (idx % 2 === 0) {
      s1.push(`${lightBgR} ${lightBgG} ${lightBgB} rg`);
      s1.push(`40 ${currentY} 532 24 re f`);
    }
    s1.push(`${borderR} ${borderG} ${borderB} RG`);
    s1.push(`40 ${currentY} 532 24 re s`);

    // Flag Name
    s1.push('BT');
    s1.push('/F5 8.5 Tf');
    s1.push(`${navyR} ${navyG} ${navyB} rg`);
    s1.push(`46 ${currentY + 8} Td (${PdfBuilder.escapeText(row.flag)}) Tj`);
    s1.push('ET');

    // Setting
    s1.push('BT');
    s1.push('/F4 8 Tf');
    s1.push(`${darkTextR} ${darkTextG} ${darkTextB} rg`);
    s1.push(`120 ${currentY + 8} Td (${PdfBuilder.escapeText(row.setting)}) Tj`);
    s1.push('ET');

    // Severity Badge
    const [sr, sg, sb] = row.sevColor;
    s1.push('BT');
    s1.push('/F2 7.5 Tf');
    s1.push(`${sr} ${sg} ${sb} rg`);
    s1.push(`240 ${currentY + 8} Td (${PdfBuilder.escapeText(row.severity)}) Tj`);
    s1.push('ET');

    // Purpose
    s1.push('BT');
    s1.push('/F1 7.5 Tf');
    s1.push(`${darkTextR} ${darkTextG} ${darkTextB} rg`);
    s1.push(`290 ${currentY + 8} Td (${PdfBuilder.escapeText(row.purpose)}) Tj`);
    s1.push('ET');

    currentY -= 24;
  });

  // Section 3: Threat Matrix & Mitigation Architecture
  currentY -= 15;
  s1.push('BT');
  s1.push('/F2 10.5 Tf');
  s1.push(`${navyR} ${navyG} ${navyB} rg`);
  s1.push(`40 ${currentY} Td (2. THREAT MATRIX & DEFENSE IN DEPTH) Tj`);
  s1.push('ET');

  currentY -= 12;
  const threats = [
    {
      threat: 'Cross-Site Scripting (XSS) Token Extraction',
      mitigation: 'Mitigated via HttpOnly flag. Even if a malicious script executes, document.cookie returns empty string.',
      level: 'Defeated'
    },
    {
      threat: 'Public Wi-Fi Packet Sniffing / Man-in-the-Middle',
      mitigation: 'Mitigated via Secure flag. Browsers refuse to transmit session cookies over unencrypted plaintext HTTP.',
      level: 'Defeated'
    },
    {
      threat: 'Cross-Site Request Forgery (CSRF) Mutations',
      mitigation: 'Mitigated via SameSite=Lax plus server-side Origin/Host header validation in src/middleware.ts.',
      level: 'Defeated'
    },
    {
      threat: 'Cross-Tenant Scope Bleed / Subdomain Hijacking',
      mitigation: 'Mitigated by omitting Domain attribute, binding the session strictly to the origin host.',
      level: 'Defeated'
    },
    {
      threat: 'Database Breach Session Forgery',
      mitigation: 'Mitigated by SHA-256 one-way hashing of opaque session tokens before database persistence.',
      level: 'Defeated'
    }
  ];

  threats.forEach((t) => {
    currentY -= 24;
    s1.push('0.98 0.98 1.0 rg');
    s1.push(`40 ${currentY} 532 22 re f`);
    s1.push(`${borderR} ${borderG} ${borderB} RG`);
    s1.push(`40 ${currentY} 532 22 re s`);

    s1.push('BT');
    s1.push('/F2 8 Tf');
    s1.push(`${navyR} ${navyG} ${navyB} rg`);
    s1.push(`46 ${currentY + 12} Td (${PdfBuilder.escapeText(t.threat)}) Tj`);
    s1.push('ET');

    s1.push('BT');
    s1.push('/F2 7 Tf');
    s1.push('0.08 0.55 0.25 rg'); // Green
    s1.push(`520 ${currentY + 12} Td ([PASS] ${PdfBuilder.escapeText(t.level)}) Tj`);
    s1.push('ET');

    s1.push('BT');
    s1.push('/F1 7.2 Tf');
    s1.push(`${mutedTextR} ${mutedTextG} ${mutedTextB} rg`);
    s1.push(`46 ${currentY + 3} Td (${PdfBuilder.escapeText(t.mitigation)}) Tj`);
    s1.push('ET');
  });

  // Page 1 Footer
  s1.push(`${borderR} ${borderG} ${borderB} RG`);
  s1.push('40 35 m 572 35 l S');
  s1.push('BT');
  s1.push('/F1 8 Tf');
  s1.push(`${mutedTextR} ${mutedTextG} ${mutedTextB} rg`);
  s1.push('40 24 Td (BeltTrack Martial Arts Management OS  |  Confidential Security Specification) Tj');
  s1.push('510 24 Td (Page 1 of 2) Tj');
  s1.push('ET');

  // ==========================================================================
  // PAGE 2: CODE IMPLEMENTATION & BROWSER VERIFICATION
  // ==========================================================================
  const p2 = doc.addPage();
  const s2 = p2.streams;

  // Background
  s2.push('1 1 1 rg');
  s2.push('0 0 612 792 re f');

  // Top Navy Brand Banner
  s2.push(`${navyR} ${navyG} ${navyB} rg`);
  s2.push('0 784 612 8 re f');

  // Page 2 Header
  s2.push('BT');
  s2.push('/F2 14 Tf');
  s2.push(`${navyR} ${navyG} ${navyB} rg`);
  s2.push('40 752 Td (3. CODE IMPLEMENTATION IN BELTTRACK) Tj');
  s2.push('ET');

  s2.push('BT');
  s2.push('/F1 8.5 Tf');
  s2.push(`${mutedTextR} ${mutedTextG} ${mutedTextB} rg`);
  s2.push('40 738 Td (Reference: Production-grade implementation in Next.js 14+ App Router and @supabase/ssr) Tj');
  s2.push('ET');

  // Divider
  s2.push(`${borderR} ${borderG} ${borderB} RG`);
  s2.push('40 728 m 572 728 l S');

  // Code Block 1: Server Client Cookie Injection
  let p2Y = 708;
  s2.push('BT');
  s2.push('/F2 9.5 Tf');
  s2.push(`${navyR} ${navyG} ${navyB} rg`);
  s2.push(`40 ${p2Y} Td (A. Server Component & Route Handler Cookie Hardening (src/lib/supabase/server.ts)) Tj`);
  s2.push('ET');

  p2Y -= 82;
  s2.push(`${lightBgR} ${lightBgG} ${lightBgB} rg`);
  s2.push(`40 ${p2Y} 532 76 re f`);
  s2.push(`${borderR} ${borderG} ${borderB} RG`);
  s2.push(`40 ${p2Y} 532 76 re s`);

  const code1 = [
    "// Merges secure defaults on all cookies set through @supabase/ssr:",
    "const isProduction = process.env.NODE_ENV === 'production';",
    "cookiesToSet.forEach(({ name, value, options }) =>",
    "  cookieStore.set(name, value, {",
    "    path: '/',",
    "    sameSite: 'lax',",
    "    secure: isProduction,",
    "    ...options,",
    "  })",
    ");"
  ];
  let c1Y = p2Y + 64;
  code1.forEach((line) => {
    s2.push('BT');
    s2.push('/F4 7.2 Tf');
    s2.push(line.startsWith('//') ? '0.4 0.45 0.5 rg' : `${navyR} ${navyG} ${navyB} rg`);
    s2.push(`50 ${c1Y} Td (${PdfBuilder.escapeText(line)}) Tj`);
    s2.push('ET');
    c1Y -= 7;
  });

  // Code Block 2: Middleware CSRF & Rolling Session Refresh
  p2Y -= 20;
  s2.push('BT');
  s2.push('/F2 9.5 Tf');
  s2.push(`${navyR} ${navyG} ${navyB} rg`);
  s2.push(`40 ${p2Y} Td (B. Middleware CSRF Origin Guard & Session Refresh (src/middleware.ts)) Tj`);
  s2.push('ET');

  p2Y -= 92;
  s2.push(`${lightBgR} ${lightBgG} ${lightBgB} rg`);
  s2.push(`40 ${p2Y} 532 86 re f`);
  s2.push(`${borderR} ${borderG} ${borderB} RG`);
  s2.push(`40 ${p2Y} 532 86 re s`);

  const code2 = [
    "// 1. CSRF Protection for state-changing API mutations (POST, PUT, PATCH, DELETE):",
    "const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);",
    "if (pathname.startsWith('/api/') && isMutation) {",
    "  const origin = request.headers.get('origin');",
    "  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');",
    "  if (origin && host && new URL(origin).host !== host) {",
    "    return NextResponse.json({ error: 'Cross-origin request blocked (CSRF)' }, { status: 403 });",
    "  }",
    "}",
    "// 2. Injects identical secure flags during automatic background session refresh."
  ];
  let c2Y = p2Y + 74;
  code2.forEach((line) => {
    s2.push('BT');
    s2.push('/F4 7 Tf');
    s2.push(line.startsWith('//') ? '0.4 0.45 0.5 rg' : `${navyR} ${navyG} ${navyB} rg`);
    s2.push(`50 ${c2Y} Td (${PdfBuilder.escapeText(line)}) Tj`);
    s2.push('ET');
    c2Y -= 7.5;
  });

  // Code Block 3: Cryptographic Session Helpers
  p2Y -= 20;
  s2.push('BT');
  s2.push('/F2 9.5 Tf');
  s2.push(`${navyR} ${navyG} ${navyB} rg`);
  s2.push(`40 ${p2Y} Td (C. Standalone Session Token Hashing & Signing (src/lib/session-security.ts)) Tj`);
  s2.push('ET');

  p2Y -= 74;
  s2.push(`${lightBgR} ${lightBgG} ${lightBgB} rg`);
  s2.push(`40 ${p2Y} 532 68 re f`);
  s2.push(`${borderR} ${borderG} ${borderB} RG`);
  s2.push(`40 ${p2Y} 532 68 re s`);

  const code3 = [
    "// One-way SHA-256 token hash for database persistence (zero plaintext storage):",
    "export function hashSessionToken(token: string): string {",
    "  return crypto.createHash('sha256').update(token).digest('hex');",
    "}",
    "// HMAC-SHA256 signature with constant-time timing-safe verification:",
    "export function signSessionCookie(sessionId: string): string { ... }",
    "export function verifySessionCookie(signedCookie: string): string | null { ... }"
  ];
  let c3Y = p2Y + 56;
  code3.forEach((line) => {
    s2.push('BT');
    s2.push('/F4 7 Tf');
    s2.push(line.startsWith('//') ? '0.4 0.45 0.5 rg' : `${navyR} ${navyG} ${navyB} rg`);
    s2.push(`50 ${c3Y} Td (${PdfBuilder.escapeText(line)}) Tj`);
    s2.push('ET');
    c3Y -= 7.5;
  });

  // Section 4: Browser Inspection & Verification Guide
  p2Y -= 24;
  s2.push('BT');
  s2.push('/F2 10.5 Tf');
  s2.push(`${navyR} ${navyG} ${navyB} rg`);
  s2.push(`40 ${p2Y} Td (4. BROWSER VERIFICATION & AUDIT CHECKLIST) Tj`);
  s2.push('ET');

  p2Y -= 12;
  const auditSteps = [
    { step: 'Step 1: Open DevTools', desc: 'Press F12 (or right-click -> Inspect) and select Application -> Storage -> Cookies.' },
    { step: 'Step 2: Inspect Auth Cookies', desc: 'Select your domain (https://belttrack.app or http://localhost:3000) and locate sb-*-auth-token.' },
    { step: 'Step 3: Confirm HttpOnly', desc: 'Confirm HttpOnly is checked. document.cookie in console must NOT disclose the JWT.' },
    { step: 'Step 4: Confirm Secure & SameSite', desc: 'Confirm Secure is checked in production and SameSite is explicitly set to Lax.' },
    { step: 'Step 5: Verify Network Response', desc: 'In Network tab, verify Set-Cookie headers contain Path=/; HttpOnly; SameSite=Lax; Secure.' }
  ];

  auditSteps.forEach((st) => {
    p2Y -= 17;
    s2.push('BT');
    s2.push('/F2 7.8 Tf');
    s2.push(`${blueR} ${blueG} ${blueB} rg`);
    s2.push(`46 ${p2Y} Td (${PdfBuilder.escapeText(st.step)}:) Tj`);
    s2.push('ET');

    s2.push('BT');
    s2.push('/F1 7.5 Tf');
    s2.push(`${darkTextR} ${darkTextG} ${darkTextB} rg`);
    s2.push(`180 ${p2Y} Td (${PdfBuilder.escapeText(st.desc)}) Tj`);
    s2.push('ET');
  });

  // Section 5: Multi-Tenant Invariant Box
  p2Y -= 32;
  s2.push('0.92 0.96 1.0 rg');
  s2.push(`40 ${p2Y} 532 26 re f`);
  s2.push('0.15 0.39 0.92 RG');
  s2.push(`40 ${p2Y} 532 26 re s`);

  s2.push('BT');
  s2.push('/F2 8 Tf');
  s2.push(`${navyR} ${navyG} ${navyB} rg`);
  s2.push(`50 ${p2Y + 15} Td (MULTI-TENANT INVARIANT GUARANTEE) Tj`);
  s2.push('ET');

  s2.push('BT');
  s2.push('/F1 7.2 Tf');
  s2.push(`${darkTextR} ${darkTextG} ${darkTextB} rg`);
  s2.push(`50 ${p2Y + 5} Td (Every verified session resolves strictly to school_id via Row-Level Security. Zero cross-tenant data leakage is permitted.) Tj`);
  s2.push('ET');

  // Page 2 Footer
  s2.push(`${borderR} ${borderG} ${borderB} RG`);
  s2.push('40 35 m 572 35 l S');
  s2.push('BT');
  s2.push('/F1 8 Tf');
  s2.push(`${mutedTextR} ${mutedTextG} ${mutedTextB} rg`);
  s2.push('40 24 Td (BeltTrack Martial Arts Management OS  |  Confidential Security Specification) Tj');
  s2.push('510 24 Td (Page 2 of 2) Tj');
  s2.push('ET');

  // Write file
  const buffer = doc.build();
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated PDF at ${outputPath} (${buffer.length} bytes)`);
}

// Generate report directly if run from CLI
const targetPath = path.resolve(__dirname, '../docs/recommended-cookie-flags.pdf');
generateCookieFlagsReport(targetPath);

