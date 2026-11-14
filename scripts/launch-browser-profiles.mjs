#!/usr/bin/env node
/**
 * scripts/launch-browser-profiles.mjs
 * 
 * Automates launching isolated browser profiles (Google Chrome or Microsoft Edge)
 * with dedicated `--user-data-dir` storage directories.
 * 
 * Usage:
 *   node scripts/launch-browser-profiles.mjs --role=owner
 *   node scripts/launch-browser-profiles.mjs --role=student
 *   node scripts/launch-browser-profiles.mjs --role=both
 *   node scripts/launch-browser-profiles.mjs --role=owner --url=http://localhost:3000
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  let role = 'both';
  let url = 'http://localhost:3000';
  let browserOverride = process.env.BROWSER_BIN || null;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--role=')) {
      role = arg.slice(7).trim().toLowerCase();
    } else if (arg.startsWith('--url=')) {
      url = arg.slice(6).trim();
    } else if (arg.startsWith('--browser=')) {
      browserOverride = arg.slice(10).trim();
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('--')) {
      const lower = arg.toLowerCase();
      if (['owner', 'student', 'coach', 'guardian', 'both'].includes(lower)) {
        role = lower;
      }
    }
  }

  return { role, url, browserOverride, dryRun };
}

// Locate browser binary (Chrome or Edge)
function findBrowser(browserOverride) {
  if (browserOverride && fs.existsSync(browserOverride)) {
    return { name: path.basename(browserOverride), path: browserOverride };
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  const candidates = [];

  if (isWindows) {
    const localAppData = process.env.LOCALAPPDATA || '';
    const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    candidates.push(
      { name: 'Google Chrome', path: path.join(progFiles, 'Google', 'Chrome', 'Application', 'chrome.exe') },
      { name: 'Google Chrome', path: path.join(progFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe') },
      { name: 'Google Chrome', path: path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') },
      { name: 'Microsoft Edge', path: path.join(progFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe') },
      { name: 'Microsoft Edge', path: path.join(progFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe') },
      { name: 'Microsoft Edge', path: path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe') }
    );
  } else if (isMac) {
    candidates.push(
      { name: 'Google Chrome', path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
      { name: 'Microsoft Edge', path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' },
      { name: 'Brave Browser', path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' }
    );
  } else if (isLinux) {
    const linuxBinaries = [
      'google-chrome-stable',
      'google-chrome',
      'chromium-browser',
      'chromium',
      'microsoft-edge-stable',
      'microsoft-edge'
    ];
    for (const bin of linuxBinaries) {
      try {
        const resolved = execSync(`which ${bin} 2>/dev/null`).toString().trim();
        if (resolved) {
          candidates.push({ name: bin, path: resolved });
        }
      } catch {
        // ignore
      }
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.path)) {
      return candidate;
    }
  }

  return null;
}

function launchProfile(browser, roleName, url, dryRun = false) {
  const profileDir = path.resolve(projectRoot, '.browser-profiles', roleName);

  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const launchArgs = [
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    url
  ];

  console.log(`\n============================================================`);
  console.log(`🚀 ${dryRun ? '[DRY RUN] Would Launch' : 'Launching'} Isolated Profile: ${roleName.toUpperCase()}`);
  console.log(`   Browser:      ${browser.name}`);
  console.log(`   Profile Path: ${profileDir}`);
  console.log(`   Target URL:   ${url}`);
  console.log(`   Command:      "${browser.path}" ${launchArgs.join(' ')}`);
  console.log(`============================================================`);

  if (dryRun) {
    return;
  }

  const child = spawn(browser.path, launchArgs, {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();
}

async function main() {
  const { role, url, browserOverride, dryRun } = parseArgs();
  const browser = findBrowser(browserOverride);

  if (!browser) {
    console.error('\n❌ Error: Neither Google Chrome nor Microsoft Edge could be located automatically.');
    console.error('   Please ensure Chrome or Edge is installed, or specify the binary path using:');
    console.error('   node scripts/launch-browser-profiles.mjs --browser="C:\\Path\\To\\browser.exe"\n');
    process.exit(1);
  }

  if (role === 'both') {
    launchProfile(browser, 'owner', url, dryRun);
    if (!dryRun) {
      // Slight pause between spawning processes to prevent OS window focus race
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    launchProfile(browser, 'student', url, dryRun);
  } else {
    launchProfile(browser, role, url, dryRun);
  }

  if (dryRun) {
    console.log('\n✅ Dry run verification completed successfully.');
  } else {
    console.log('\n✅ Launch command dispatched successfully.');
    console.log('💡 Note: These profile windows maintain isolated cookies, localStorage, and Supabase auth states.');
    console.log('   You can sign into Dojo Owner in one window and Student in the other without cookie collision.\n');
  }
}

main().catch((err) => {
  console.error('Fatal error launching browser profiles:', err);
  process.exit(1);
});
