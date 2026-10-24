const fs = require('fs');
const path = require('path');

const tokensPath = path.resolve(__dirname, 'tokens-complete.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

function hex8ToRgba(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 9) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = (parseInt(hex.slice(7, 9), 16) / 255).toFixed(3).replace(/\.?0+$/, '');
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function resolveRef(val, root) {
  if (typeof val !== 'string') return val;
  if (!val.startsWith('{') || !val.endsWith('}')) return val;
  const parts = val.slice(1, -1).split('.');
  let cur = root;
  for (const p of parts) {
    if (!cur) return val;
    cur = cur[p];
  }
  return cur && cur.value ? resolveRef(cur.value, root) : cur;
}

// ----------------------------------------------------
// 1. BUILD variables.css
// ----------------------------------------------------
let varCss = `/**
 * BeltTrack Design System - CSS Custom Properties
 * Generated directly from Figma Design Tokens (tokens-complete.json)
 *
 * Source: Figma Tokens / Lukas Oppermann Export
 * Includes: Effects (Drop Shadows), Primitives (Key Colours & Palettes),
 * Colour Roles (Material Design 3 semantic tokens), and Typography.
 */

:root {
  /* ==========================================================================
     1. FONT FAMILY PRIMITIVES
     ========================================================================== */
  --font-family-barlow-semi-condensed: "Barlow Semi Condensed", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-outfit: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-inter: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-jetbrains-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Font Family Semantic Roles */
  --font-family-display: var(--font-family-barlow-semi-condensed);
  --font-family-headline: var(--font-family-outfit);
  --font-family-title: var(--font-family-outfit);
  --font-family-body: var(--font-family-inter);
  --font-family-label: var(--font-family-jetbrains-mono);

  /* ==========================================================================
     2. EFFECT TOKENS (DROP SHADOWS)
     ========================================================================== */
`;

const effects = tokens.effect || {};
for (const [key, effect] of Object.entries(effects)) {
  const kebab = key.toLowerCase().replace(/\s+/g, '-');
  const v = effect.value;
  const prefix = `--effect-${kebab}`;
  const rgba = hex8ToRgba(v.color);

  varCss += `  /* ${key}${effect.description ? ' (' + effect.description + ')' : ''} */\n`;
  varCss += `  ${prefix}-offset-x: ${v.offsetX}px;\n`;
  varCss += `  ${prefix}-offset-y: ${v.offsetY}px;\n`;
  varCss += `  ${prefix}-blur: ${v.radius}px;\n`;
  varCss += `  ${prefix}-spread: ${v.spread}px;\n`;
  varCss += `  ${prefix}-color: ${v.color}; /* ${rgba} */\n`;
  varCss += `  ${prefix}: var(${prefix}-offset-x) var(${prefix}-offset-y) var(${prefix}-blur) var(${prefix}-spread) var(${prefix}-color);\n`;
  varCss += `  --shadow-${kebab}: var(${prefix});\n\n`;
}

// 3. PRIMITIVES - KEY COLOURS
varCss += `  /* ==========================================================================
     3. KEY COLOUR PRIMITIVES
     ========================================================================== */\n`;
const keyColours = tokens['primitives 2']?.keycolours_2 || {};
for (const [key, token] of Object.entries(keyColours)) {
  const cleanKey = key.replace(/_2$/, '').replace(/keycolour$/, '').toLowerCase();
  const hex = token.value;
  varCss += `  --key-color-${cleanKey}: ${hex}; /* ${hex8ToRgba(hex)} */\n`;
}
varCss += `\n`;

// 4. PRIMITIVES - TONAL PALETTES
varCss += `  /* ==========================================================================
     4. TONAL COLOUR PALETTES (0 - 100)
     ========================================================================== */\n`;
const palettes = tokens['primitives 2']?.['colour palette2'] || {};
for (const [paletteName, swatches] of Object.entries(palettes)) {
  varCss += `  /* --- Palette: ${paletteName} --- */\n`;
  for (const [swatchKey, token] of Object.entries(swatches)) {
    const hex = token.value;
    const matchNum = swatchKey.match(/\d+$/);
    const num = matchNum ? matchNum[0] : swatchKey;
    const varName = `--color-palette-${paletteName.toLowerCase()}-${num}`;
    varCss += `  ${varName}: ${hex};\n`;
  }
  varCss += `\n`;
}

// 5. COLOUR ROLES
varCss += `  /* ==========================================================================
     5. COLOUR ROLES (MATERIAL DESIGN 3 SEMANTIC SYSTEM)
     ========================================================================== */\n`;
const colourRoles = tokens['colour roles'] || {};
for (const [roleName, token] of Object.entries(colourRoles)) {
  const kebab = roleName.toLowerCase().replace(/\s+/g, '-');
  const resolved = resolveRef(token.value, tokens);
  varCss += `  --color-${kebab}: ${resolved};\n`;
  if (kebab === 'secondary-containe') {
    varCss += `  --color-secondary-container: ${resolved};\n`;
  }
}
varCss += `\n`;

// 6. TYPOGRAPHY TOKENS
varCss += `  /* ==========================================================================
     6. TYPOGRAPHY TOKENS (ATOMIC PROPERTIES)
     ========================================================================== */\n`;
const typography = tokens.typography || {};
const fontRefMap = {
  'Barlow Semi Condensed': 'var(--font-family-barlow-semi-condensed)',
  'Outfit': 'var(--font-family-outfit)',
  'Inter': 'var(--font-family-inter)',
  'JetBrains Mono': 'var(--font-family-jetbrains-mono)'
};

for (const [typoName, token] of Object.entries(typography)) {
  const kebab = typoName.toLowerCase().replace(/\s+/g, '-');
  const v = token.value || token;
  const prefix = `--typography-${kebab}`;
  const ff = v.fontFamily?.value || v.fontFamily;
  const fw = v.fontWeight?.value || v.fontWeight;
  const fsVal = v.fontSize?.value || v.fontSize;
  const lhVal = v.lineHeight?.value || v.lineHeight;
  const lsVal = v.letterSpacing?.value || v.letterSpacing;

  varCss += `  /* ${typoName} */\n`;
  varCss += `  ${prefix}-font-family: ${fontRefMap[ff] || `"${ff}", sans-serif`};\n`;
  varCss += `  ${prefix}-font-weight: ${fw};\n`;
  varCss += `  ${prefix}-font-size: ${fsVal}px;\n`;
  varCss += `  ${prefix}-line-height: ${lhVal}px;\n`;
  varCss += `  ${prefix}-letter-spacing: ${lsVal}px;\n\n`;
}

varCss += `}\n`;

fs.writeFileSync(path.resolve(__dirname, 'variables.css'), varCss, 'utf8');
console.log('variables.css written successfully.');

// ----------------------------------------------------
// 2. BUILD typography.css
// ----------------------------------------------------
let typoCss = `/**
 * BeltTrack Design System - Typography Utility Classes
 * Generated directly from Figma Design Tokens (tokens-complete.json)
 */

@import "./variables.css";
@import url("https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700&display=swap");

`;

for (const [typoName] of Object.entries(typography)) {
  const kebab = typoName.toLowerCase().replace(/\s+/g, '-');
  const prefix = `--typography-${kebab}`;

  typoCss += `/* ${typoName} */
.typography-${kebab},
.${kebab} {
  font-family: var(${prefix}-font-family);
  font-size: var(${prefix}-font-size);
  font-weight: var(${prefix}-font-weight);
  line-height: var(${prefix}-line-height);
  letter-spacing: var(${prefix}-letter-spacing);
}

`;
}

fs.writeFileSync(path.resolve(__dirname, 'typography.css'), typoCss, 'utf8');
console.log('typography.css written successfully.');
