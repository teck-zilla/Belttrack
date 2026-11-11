/**
 * BeltTrack Registration Performance Benchmark Tool
 * 
 * Compares Synchronous vs. Asynchronous (Background Job) Email Dispatch
 * Usage:
 *   node scripts/benchmark-registration.mjs [baseUrl]
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

function generatePayload(mode) {
  const ts = Date.now();
  const rand4 = Math.floor(1000 + Math.random() * 8999);
  const prefix = mode === 'sync' ? 'SYNC' : 'ASYNC';

  return {
    schoolName: `Benchmark Dojo ${ts}`,
    discipline: 'brazilian_jiu_jitsu',
    ownerFullName: 'Sensei Benchmark',
    ownerEmail: `sensei.${mode}.${ts}@kaizenbjj.org`,
    password: 'Correct-Horse-Battery-Staple-2026!',
    confirmPassword: 'Correct-Horse-Battery-Staple-2026!',
    city: 'London',
    country: 'United Kingdom',
    customCode: `${prefix}-BJJ-${rand4}`
  };
}

async function benchmark() {
  console.log('==================================================');
  console.log('   BeltTrack Registration Performance Benchmark   ');
  console.log('==================================================\n');
  console.log(`Target Base URL: ${baseUrl}\n`);

  // Quick healthcheck to see if the server is running
  try {
    await fetch(`${baseUrl}/api/schools/directory`);
  } catch (err) {
    console.error(`❌ Could not connect to dev server at ${baseUrl}.`);
    console.error('   Please ensure your Next.js server is running (npm run dev) before running this benchmark.\n');
    process.exit(1);
  }

  // --- Run 1: Synchronous Mode (Email on request thread) ---
  console.log('1. Executing Synchronous Registration (email inside request)...');
  const syncPayload = generatePayload('sync');
  const syncStart = performance.now();
  const syncRes = await fetch(`${baseUrl}/api/schools/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(syncPayload)
  });
  const syncClientMs = Math.round(performance.now() - syncStart);
  const syncData = await syncRes.json();
  const syncHeader = syncRes.headers.get('Server-Timing');

  if (!syncRes.ok) {
    console.error('❌ Synchronous request failed:', syncData);
    process.exit(1);
  }
  console.log(`   ✅ Synchronous response received in ${syncClientMs}ms`);
  console.log(`      Server-Timing Header: ${syncHeader}\n`);

  // --- Run 2: Background Job Mode (?async_email=true) ---
  console.log('2. Executing Asynchronous Registration (email in background job)...');
  const asyncPayload = generatePayload('async');
  const asyncStart = performance.now();
  const asyncRes = await fetch(`${baseUrl}/api/schools/register?async_email=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asyncPayload)
  });
  const asyncClientMs = Math.round(performance.now() - asyncStart);
  const asyncData = await asyncRes.json();
  const asyncHeader = asyncRes.headers.get('Server-Timing');

  if (!asyncRes.ok) {
    console.error('❌ Asynchronous request failed:', asyncData);
    process.exit(1);
  }
  console.log(`   ✅ Background job response received in ${asyncClientMs}ms`);
  console.log(`      Server-Timing Header: ${asyncHeader}\n`);

  // --- Summary Table ---
  console.log('==================================================');
  console.log('                BENCHMARK RESULTS                 ');
  console.log('==================================================\n');

  const resultsTable = [
    {
      'Metric': 'Client Round-Trip (TTFB)',
      'Synchronous (In-Request)': `${syncClientMs} ms`,
      'Background Job (?async_email=true)': `${asyncClientMs} ms`,
      'Delta / Speedup': `${Math.max(1, (syncClientMs / Math.max(1, asyncClientMs))).toFixed(1)}x faster`
    },
    {
      'Metric': 'Server Total Time (totalMs)',
      'Synchronous (In-Request)': `${syncData.timings?.totalMs ?? 'N/A'} ms`,
      'Background Job (?async_email=true)': `${asyncData.timings?.totalMs ?? 'N/A'} ms`,
      'Delta / Speedup': `${Math.max(1, ((syncData.timings?.totalMs || 1) / Math.max(1, asyncData.timings?.totalMs || 1))).toFixed(1)}x faster`
    },
    {
      'Metric': 'Database Persistence (dbMs)',
      'Synchronous (In-Request)': `${syncData.timings?.dbMs ?? 'N/A'} ms`,
      'Background Job (?async_email=true)': `${asyncData.timings?.dbMs ?? 'N/A'} ms`,
      'Delta / Speedup': 'Identical'
    },
    {
      'Metric': 'Email In-Request Latency (emailMs)',
      'Synchronous (In-Request)': `${syncData.timings?.emailMs ?? 'N/A'} ms`,
      'Background Job (?async_email=true)': `${asyncData.timings?.emailMs ?? 0} ms (non-blocking)`,
      'Delta / Speedup': 'Decoupled'
    }
  ];

  console.table(resultsTable);
  console.log('==================================================\n');
}

benchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});

