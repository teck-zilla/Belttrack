/**
 * BeltTrack Live SMTP Diagnostic & Connection Verification Tool
 * 
 * Usage:
 *   node scripts/test-live-smtp.mjs [optional-recipient-email]
 * 
 * Verifies:
 * 1. Checks .env for SMTP credentials (host, port, user, pass, from).
 * 2. Connects to the SMTP server and validates credentials using transporter.verify().
 * 3. (Optional) Sends a real test verification email to the specified recipient.
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { renderVerificationEmailHtml } from '../src/lib/email-verification.ts';

// Basic .env loader if not already in process.env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  const targetRecipient = process.argv[2];

  console.log('==================================================');
  console.log('      BeltTrack SMTP Diagnostic & Live Test       ');
  console.log('==================================================\n');

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || '"BeltTrack Martial Arts" <no-reply@belttrack.app>';

  console.log('1. Active SMTP Environment Configuration:');
  console.log(`   - Host:   ${host || '(NOT SET - check .env)'}`);
  console.log(`   - Port:   ${port} (Secure/SSL: ${secure})`);
  console.log(`   - User:   ${user ? user.slice(0, 4) + '****' : '(NOT SET - check .env)'}`);
  console.log(`   - Pass:   ${pass ? '********' : '(NOT SET - check .env)'}`);
  console.log(`   - From:   ${from}\n`);

  if (!host || !user || !pass) {
    console.log('⚠️  SMTP credentials are incomplete in your .env file.');
    console.log('   Add the following lines to your .env file:');
    console.log('   --------------------------------------------------');
    console.log('   SMTP_HOST=smtp.your-provider.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_SECURE=false');
    console.log('   SMTP_USER=your-smtp-username');
    console.log('   SMTP_PASS=your-smtp-password');
    console.log('   SMTP_FROM="BeltTrack Dojo <no-reply@yourdomain.com>"');
    console.log('   --------------------------------------------------\n');
    console.log('   (Until set, BeltTrack automatically logs emails to the server console)\n');
    process.exit(0);
  }

  console.log(`2. Connecting to SMTP Server: ${host}:${port}...`);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000
  });

  const connectStart = performance.now();
  try {
    await transporter.verify();
    const connectDurationMs = Math.round(performance.now() - connectStart);
    console.log(`   ✅ SMTP CONNECTION VERIFIED in ${connectDurationMs}ms: Server is ready to deliver messages.\n`);
  } catch (verifyErr) {
    const connectDurationMs = Math.round(performance.now() - connectStart);
    console.error(`   ❌ SMTP CONNECTION FAILED (after ${connectDurationMs}ms):`);
    console.error(`      Code:    ${verifyErr.code || 'UNKNOWN'}`);
    console.error(`      Message: ${verifyErr.message}\n`);
    
    if (verifyErr.code === 'EAUTH') {
      console.log('   💡 Tip: Check your SMTP_USER and SMTP_PASS. For Gmail, use an App Password, not your regular password.');
    } else if (verifyErr.code === 'ETIMEDOUT' || verifyErr.code === 'ECONNREFUSED') {
      console.log(`   💡 Tip: Port ${port} may be blocked by your network or firewall. Try port 587 with SMTP_SECURE=false or port 465 with SMTP_SECURE=true.`);
    }
    process.exit(1);
  }

  // 3. Optional: Send test message
  if (targetRecipient) {
    console.log(`3. Sending Test Verification Email to: ${targetRecipient}...`);
    const sendStart = performance.now();
    try {
      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      const info = await transporter.sendMail({
        from,
        to: targetRecipient,
        subject: 'BeltTrack - SMTP Live Diagnostic Test',
        text: `Welcome to BeltTrack Martial Arts Management!\n\nYour test verification code is: ${mockCode}\n\nThis code will expire in 6 minutes.\nEnter this code in your BeltTrack dashboard banner to confirm your email.\nIf you did not register for an account, please disregard this email.`,
        html: renderVerificationEmailHtml(mockCode, targetRecipient)
      });

      const sendDurationMs = Math.round(performance.now() - sendStart);
      console.log('   ✅ TEST EMAIL DELIVERED!');
      console.log(`      Response Time: ${sendDurationMs}ms`);
      console.log(`      Message ID:    ${info.messageId}`);
      console.log(`      Response:      ${info.response}\n`);
    } catch (sendErr) {
      const sendDurationMs = Math.round(performance.now() - sendStart);
      console.error(`   ❌ FAILED TO DELIVER TEST EMAIL (after ${sendDurationMs}ms):`);
      console.error(`      Message: ${sendErr.message}\n`);
      process.exit(1);
    }
  } else {
    console.log('3. Ready to test sending an email:');
    console.log(`   Run: node scripts/test-live-smtp.mjs your-email@example.com\n`);
  }

  console.log('==================================================');
  console.log('                 DIAGNOSTIC COMPLETE              ');
  console.log('==================================================\n');
}

main().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});

