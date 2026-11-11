/**
 * BeltTrack UI Contrast Ratios PDF Generator
 * 
 * Generates docs/ui-contrast-ratios.pdf documenting WCAG 2.1 contrast ratios
 * for all role pairs applied in the BeltTrack user interface.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PdfBuilder {
  constructor(pageWidth = 792, pageHeight = 612) {
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

// 16 UI Role Pairs actively applied in the BeltTrack user interface
const uiRolePairs = [
  { usage: 'Primary CTA Button (Active Role / Submit)', bgToken: 'bg-primary', bgHex: '#1B2A4A', fgToken: 'text-primary-foreground', fgHex: '#FFFFFF', ratio: '14.22:1', level: 'AAA' },
  { usage: 'Attendance Badge ("18 Checked In")', bgToken: 'bg-tertiary-container', bgHex: '#BDD0FF', fgToken: 'text-tertiary-on-container', fgHex: '#142B6A', ratio: '8.61:1', level: 'AAA' },
  { usage: 'Sparring / Settlement Badge ("12 Confirmed", "0% FEES")', bgToken: 'bg-primary-container', bgHex: '#A8BEFF', fgToken: 'text-primary-on-container', fgHex: '#121C33', ratio: '9.26:1', level: 'AAA' },
  { usage: 'Card Surface Lowest (Main Dashboard Cards)', bgToken: 'bg-surface-container-lowest', bgHex: '#FFFFFF', fgToken: 'text-surface-foreground', fgHex: '#101115', ratio: '18.87:1', level: 'AAA' },
  { usage: 'Card Surface Lowest + Primary Heading Text', bgToken: 'bg-surface-container-lowest', bgHex: '#FFFFFF', fgToken: 'text-primary', fgHex: '#1B2A4A', ratio: '14.22:1', level: 'AAA' },
  { usage: 'Card Surface Lowest + Secondary / Variant Body Text', bgToken: 'bg-surface-container-lowest', bgHex: '#FFFFFF', fgToken: 'text-surface-on-variant', fgHex: '#32353E', ratio: '12.25:1', level: 'AAA' },
  { usage: 'Card Surface Lowest + Tertiary Accent Links/Labels', bgToken: 'bg-surface-container-lowest', bgHex: '#FFFFFF', fgToken: 'text-tertiary', fgHex: '#2563EB', ratio: '5.17:1', level: 'AA' },
  { usage: 'Schedule Item Container Low + Primary Text', bgToken: 'bg-surface-container-low', bgHex: '#F4F3FB', fgToken: 'text-primary', fgHex: '#1B2A4A', ratio: '12.91:1', level: 'AAA' },
  { usage: 'Schedule Item Container Low + Variant Text', bgToken: 'bg-surface-container-low', bgHex: '#F4F3FB', fgToken: 'text-surface-on-variant', fgHex: '#32353E', ratio: '11.12:1', level: 'AAA' },
  { usage: 'Directory Button (Surface Container + Foreground)', bgToken: 'bg-surface-container', bgHex: '#E2E2EA', fgToken: 'text-surface-foreground', fgHex: '#101115', ratio: '14.64:1', level: 'AAA' },
  { usage: 'Inactive Segment Switcher (Container + Variant)', bgToken: 'bg-surface-container', bgHex: '#E2E2EA', fgToken: 'text-surface-on-variant', fgHex: '#32353E', ratio: '9.51:1', level: 'AAA' },
  { usage: 'Error Alert Banner (Error Container + On-Error)', bgToken: 'bg-error-container', bgHex: '#FFDAD2', fgToken: 'text-error-on-container', fgHex: '#690003', ratio: '10.12:1', level: 'AAA' },
  { usage: 'Email Verification Notice Badge (Warning + On-Warning)', bgToken: 'bg-warning', bgHex: '#DE990F', fgToken: 'text-warning-foreground', fgHex: '#150C00', ratio: '7.99:1', level: 'AAA' },
  { usage: 'Modal Dialog Box (Surface Container Lowest + Outline)', bgToken: 'bg-surface-container-lowest', bgHex: '#FFFFFF', fgToken: 'text-outline', fgHex: '#5C5E6A', ratio: '6.43:1', level: 'AA' },
  { usage: 'Modal Backdrop / Dialog Scrim (Inverse Surface)', bgToken: 'bg-inverse-surface', bgHex: '#202227', fgToken: 'text-inverse-on-surface', fgHex: '#E5E5ED', ratio: '12.70:1', level: 'AAA' },
  { usage: 'Martial Arts Belt Graphic (Black Rank Bar + White Stripes)', bgToken: 'bg-inverse-surface', bgHex: '#202227', fgToken: 'bg-surface-container-lowest', fgHex: '#FFFFFF', ratio: '15.91:1', level: 'AAA' },
];

export function generateLandscapeReport(outputPath) {
  const doc = new PdfBuilder(792, 612); // Standard US Letter Landscape
  const page = doc.addPage();
  const s = page.streams;

  // Background: clean white
  s.push('1 1 1 rg');
  s.push('0 0 792 612 re f');

  // Top Navy Brand Bar
  const [pr, pg, pb] = PdfBuilder.hexToRgb('#1b2a4a');
  s.push(`${pr} ${pg} ${pb} rg`);
  s.push('0 604 792 8 re f');

  // Document Title & Header
  s.push('BT');
  s.push('/F2 18 Tf');
  s.push(`${pr} ${pg} ${pb} rg`);
  s.push('36 574 Td (BELTTRACK MARTIAL ARTS MANAGEMENT) Tj');
  s.push('ET');

  s.push('BT');
  s.push('/F2 12 Tf');
  s.push('0.22 0.27 0.36 rg');
  s.push('36 557 Td (Design System WCAG 2.1 Contrast Ratio Audit Report) Tj');
  s.push('ET');

  s.push('BT');
  s.push('/F1 8.5 Tf');
  s.push('0.45 0.48 0.55 rg');
  s.push('36 544 Td (Scope: Role Pairs Applied in the BeltTrack UI  |  Evaluation Standard: WCAG 2.1 Relative Luminance Algorithm  |  Audit Date: November 2026) Tj');
  s.push('ET');

  // Header Divider
  s.push('0.85 0.87 0.90 RG');
  s.push('1 w');
  s.push('36 536 m 756 536 l s');

  // Executive Summary Callout Box
  s.push('0.96 0.97 0.99 rg');
  s.push('0.82 0.86 0.94 RG');
  s.push('36 476 720 44 re B');

  s.push('BT');
  s.push('/F2 8.5 Tf');
  s.push(`${pr} ${pg} ${pb} rg`);
  s.push('48 506 Td (EXECUTIVE SUMMARY & ACCESSIBILITY COMPLIANCE HIGHLIGHTS) Tj');
  s.push('ET');

  s.push('BT');
  s.push('/F1 7.8 Tf');
  s.push('0.22 0.25 0.32 rg');
  s.push('48 494 Td (  - 100% of tested UI role pairs meet or exceed WCAG 2.1 Level AA (minimum 4.5:1 for standard body text).) Tj');
  s.push('48 483 Td (  - 87.5% of UI role pairs (14 of 16) achieve WCAG Level AAA Enhanced Contrast (minimum 7.0:1). Maximum UI contrast reaches 18.87:1.) Tj');
  s.push('ET');

  // Table Coordinates
  const startY = 464;
  const rowH = 21;

  // Table Header Background
  s.push(`${pr} ${pg} ${pb} rg`);
  s.push(`36 ${startY - 18} 720 18 re f`);

  // Table Header Text
  s.push('BT');
  s.push('/F2 8 Tf');
  s.push('1 1 1 rg');
  s.push('44 453 Td (UI Component Usage) Tj');
  s.push('274 453 Td (Background Role & Value) Tj');
  s.push('424 453 Td (Foreground Role & Value) Tj');
  s.push('592 453 Td (Contrast Ratio) Tj');
  s.push('686 453 Td (WCAG Status) Tj');
  s.push('ET');

  // Table Rows
  let curY = startY - 18;

  uiRolePairs.forEach((row, idx) => {
    curY -= rowH;
    const isEven = idx % 2 === 0;

    // Row zebra background
    if (isEven) {
      s.push('0.975 0.98 0.995 rg');
      s.push(`36 ${curY} 720 ${rowH} re f`);
    } else {
      s.push('1 1 1 rg');
      s.push(`36 ${curY} 720 ${rowH} re f`);
    }

    // Row Bottom Border
    s.push('0.88 0.90 0.93 RG');
    s.push('0.5 w');
    s.push(`36 ${curY} m 756 ${curY} l s`);

    // Column 1: UI Component Usage
    s.push('BT');
    s.push('/F2 7.8 Tf');
    s.push('0.10 0.12 0.18 rg');
    s.push(`44 ${curY + 7} Td (${PdfBuilder.escapeText(row.usage)}) Tj`);
    s.push('ET');

    // Column 2: Background Swatch & Text
    const [br, bg, bb] = PdfBuilder.hexToRgb(row.bgHex);
    s.push(`${br} ${bg} ${bb} rg`);
    s.push('0.70 0.73 0.78 RG');
    s.push('0.5 w');
    s.push(`274 ${curY + 5.5} 8.5 8.5 re B`); // Color chip

    s.push('BT');
    s.push('/F1 7.5 Tf');
    s.push('0.18 0.20 0.25 rg');
    s.push(`288 ${curY + 7} Td (${PdfBuilder.escapeText(row.bgHex)}  ${PdfBuilder.escapeText(row.bgToken)}) Tj`);
    s.push('ET');

    // Column 3: Foreground Swatch & Text
    const [fr, fg, fb] = PdfBuilder.hexToRgb(row.fgHex);
    s.push(`${fr} ${fg} ${fb} rg`);
    s.push('0.70 0.73 0.78 RG');
    s.push('0.5 w');
    s.push(`424 ${curY + 5.5} 8.5 8.5 re B`); // Color chip

    s.push('BT');
    s.push('/F1 7.5 Tf');
    s.push('0.18 0.20 0.25 rg');
    s.push(`438 ${curY + 7} Td (${PdfBuilder.escapeText(row.fgHex)}  ${PdfBuilder.escapeText(row.fgToken)}) Tj`);
    s.push('ET');

    // Column 4: Contrast Ratio (Bold, Centered)
    s.push('BT');
    s.push('/F2 8.5 Tf');
    s.push(`${pr} ${pg} ${pb} rg`);
    s.push(`600 ${curY + 7} Td (${PdfBuilder.escapeText(row.ratio)}) Tj`);
    s.push('ET');

    // Column 5: WCAG Status Badge
    const isAAA = row.level === 'AAA';
    if (isAAA) {
      s.push('0.90 0.96 0.92 rg'); // soft emerald bg
      s.push('0.65 0.84 0.72 RG');
      s.push('0.5 w');
      s.push(`682 ${curY + 4} 64 12.5 re B`);

      s.push('BT');
      s.push('/F2 7.2 Tf');
      s.push('0.06 0.42 0.20 rg');
      s.push(`691 ${curY + 7.5} Td (AAA (Pass)) Tj`);
      s.push('ET');
    } else {
      s.push('0.92 0.94 0.99 rg'); // soft indigo bg
      s.push('0.70 0.80 0.94 RG');
      s.push('0.5 w');
      s.push(`682 ${curY + 4} 64 12.5 re B`);

      s.push('BT');
      s.push('/F2 7.2 Tf');
      s.push('0.12 0.32 0.72 rg');
      s.push(`694 ${curY + 7.5} Td (AA (Pass)) Tj`);
      s.push('ET');
    }
  });

  // Table Outer Frame
  s.push('0.80 0.82 0.86 RG');
  s.push('1 w');
  s.push(`36 ${curY} 720 ${startY - curY} re s`);

  // Footer
  const footerY = curY - 20;
  s.push('BT');
  s.push('/F1 7.5 Tf');
  s.push('0.45 0.48 0.55 rg');
  s.push(`36 ${footerY} Td`);
  s.push('(* WCAG 2.1 Benchmark: Normal text threshold is >= 4.5:1 (AA) and >= 7.0:1 (AAA). UI graphical components threshold is >= 3.0:1.) Tj');
  s.push('0 -11 Td');
  s.push('(BeltTrack Martial Arts Management Platform  |  Private Multi-Tenant Architecture  |  Zero Monetization  |  100% Token Compliant) Tj');
  s.push('ET');

  s.push('BT');
  s.push('/F2 7.5 Tf');
  s.push(`${pr} ${pg} ${pb} rg`);
  s.push(`705 ${footerY - 11} Td`);
  s.push('(Page 1 of 1) Tj');
  s.push('ET');

  const pdfBuffer = doc.build();
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`[BELTTRACK DESIGN] PDF successfully generated at: ${outputPath} (${pdfBuffer.length} bytes)`);
}

const targetPath = path.resolve(__dirname, '../docs/ui-contrast-ratios.pdf');
generateLandscapeReport(targetPath);

