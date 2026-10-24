const fs = require('fs');
const path = require('path');

const sourceFiles = [
  'index.html',
  'index.css',
  'app.js'
];

const hexRegex = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const rgbaRegex = /rgba?\([^)]+\)/g;
const hslaRegex = /hsla?\([^)]+\)/g;

let totalViolations = 0;
const violations = [];

for (const file of sourceFiles) {
  const filePath = path.resolve(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) return;

    // Check Hex
    let match;
    hexRegex.lastIndex = 0;
    while ((match = hexRegex.exec(line)) !== null) {
      violations.push({ file, line: idx + 1, type: 'HEX', raw: match[0], context: trimmed });
      totalViolations++;
    }

    // Check RGBA
    rgbaRegex.lastIndex = 0;
    while ((match = rgbaRegex.exec(line)) !== null) {
      // Allow rgba in comments or if strictly forbidden
      violations.push({ file, line: idx + 1, type: 'RGBA', raw: match[0], context: trimmed });
      totalViolations++;
    }

    // Check HSLA
    hslaRegex.lastIndex = 0;
    while ((match = hslaRegex.exec(line)) !== null) {
      violations.push({ file, line: idx + 1, type: 'HSLA', raw: match[0], context: trimmed });
      totalViolations++;
    }
  });
}

console.log('==================================================');
console.log('       BELTTRACK DESIGN SYSTEM AUDIT REPORT       ');
console.log('==================================================');
console.log(`Files Audited: ${sourceFiles.join(', ')}`);
console.log(`Hardcoded Color Violations Found: ${totalViolations}`);

if (totalViolations > 0) {
  console.log('\nViolations List:');
  violations.forEach(v => {
    console.log(`  [${v.file}:${v.line}] (${v.type}) ${v.raw} -> in: ${v.context}`);
  });
  console.log('\nFAIL: Please replace hardcoded colors with CSS variables from variables.css.');
  process.exit(1);
} else {
  console.log('\nSUCCESS: 100% Design Token Compliance! No hardcoded colors found.');
  process.exit(0);
}
