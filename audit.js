const fs = require('fs');
const path = require('path');

function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'variables.css' || file === 'tokens-complete.json') continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFilesRecursively(fullPath, fileList);
    } else if (/\.(html|css|js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const sourceFiles = [
  path.resolve(__dirname, 'index.html'),
  path.resolve(__dirname, 'index.css'),
  path.resolve(__dirname, 'app.js'),
  ...getFilesRecursively(path.resolve(__dirname, 'src'))
].filter((f, idx, arr) => arr.indexOf(f) === idx && fs.existsSync(f));

const hexRegex = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const rgbaRegex = /rgba?\([^)]+\)/g;
const hslaRegex = /hsla?\([^)]+\)/g;

let totalViolations = 0;
const violations = [];

for (const filePath of sourceFiles) {
  const relativeFile = path.relative(__dirname, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) return;

    // Check Hex
    let match;
    hexRegex.lastIndex = 0;
    while ((match = hexRegex.exec(line)) !== null) {
      violations.push({ file: relativeFile, line: idx + 1, type: 'HEX', raw: match[0], context: trimmed });
      totalViolations++;
    }

    // Check RGBA
    rgbaRegex.lastIndex = 0;
    while ((match = rgbaRegex.exec(line)) !== null) {
      violations.push({ file: relativeFile, line: idx + 1, type: 'RGBA', raw: match[0], context: trimmed });
      totalViolations++;
    }

    // Check HSLA
    hslaRegex.lastIndex = 0;
    while ((match = hslaRegex.exec(line)) !== null) {
      violations.push({ file: relativeFile, line: idx + 1, type: 'HSLA', raw: match[0], context: trimmed });
      totalViolations++;
    }
  });
}

console.log('==================================================');
console.log('       BELTTRACK DESIGN SYSTEM AUDIT REPORT       ');
console.log('==================================================');
console.log(`Files Audited: ${sourceFiles.length} files`);
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
