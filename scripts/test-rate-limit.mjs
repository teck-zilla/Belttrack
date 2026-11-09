/**
 * BeltTrack Multi-IP Rate Limiting Verification Suite
 * 
 * Verifies:
 * 1. Requests from the same simulated IP share the same counter.
 * 2. Requests from different simulated IPs have independent counters.
 * 3. Exceeding the threshold triggers HTTP 429 with correct headers.
 * 4. Other endpoints and independent IPs remain completely unblocked.
 * 5. Production safety: When NODE_ENV === 'production', simulated headers are ignored.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Generate unique test IPs per run so repeated suite executions never collide
const runId = Math.floor(Math.random() * 200) + 10;
const IP_ALPHA = `203.0.113.${runId}`;
const IP_BETA  = `198.51.100.${runId}`;

async function requestLogin(simulatedIp, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  if (simulatedIp) {
    headers['x-simulated-ip'] = simulatedIp;
  }

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: 'ratelimit-test@example.com',
      password: 'Password123!'
    })
  });

  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    limit: res.headers.get('x-ratelimit-limit'),
    remaining: res.headers.get('x-ratelimit-remaining'),
    retryAfter: res.headers.get('retry-after'),
    body
  };
}

async function runSuite() {
  console.log('==================================================');
  console.log(' BeltTrack Multi-IP Rate Limiting Automated Suite');
  console.log(` Target Server: ${BASE_URL}`);
  console.log(` Client Alpha IP: ${IP_ALPHA}`);
  console.log(` Client Beta IP:  ${IP_BETA}`);
  console.log('==================================================\n');

  // Test 1: Counter sharing on IP_ALPHA
  console.log('[Test 1] Verifying same IP shares rate-limit counter...');
  const resA1 = await requestLogin(IP_ALPHA);
  console.log(`  IP_ALPHA Attempt 1: HTTP ${resA1.status}, Remaining: ${resA1.remaining}`);
  
  const resA2 = await requestLogin(IP_ALPHA);
  console.log(`  IP_ALPHA Attempt 2: HTTP ${resA2.status}, Remaining: ${resA2.remaining}`);

  if (Number(resA2.remaining) !== Number(resA1.remaining) - 1) {
    throw new Error(`FAIL: Counter did not decrement sequentially for same IP! Expected ${Number(resA1.remaining) - 1}, got ${resA2.remaining}`);
  }
  console.log('  -> PASS: Same IP shares rate-limit counter.\n');

  // Test 2: Counter isolation on IP_BETA
  console.log('[Test 2] Verifying different IP has independent counter...');
  const resB1 = await requestLogin(IP_BETA);
  console.log(`  IP_BETA Attempt 1: HTTP ${resB1.status}, Remaining: ${resB1.remaining}`);

  if (Number(resB1.remaining) !== 4) {
    throw new Error(`FAIL: IP_BETA counter was affected by IP_ALPHA! Expected 4, got ${resB1.remaining}`);
  }
  console.log('  -> PASS: Different IPs maintain strictly independent counters.\n');

  // Test 3: Exhaust IP_ALPHA until HTTP 429
  console.log('[Test 3] Exhausting IP_ALPHA to verify HTTP 429 lock-out...');
  await requestLogin(IP_ALPHA); // Attempt 3
  await requestLogin(IP_ALPHA); // Attempt 4
  const resA5 = await requestLogin(IP_ALPHA); // Attempt 5 (last permitted)
  console.log(`  IP_ALPHA Attempt 5: HTTP ${resA5.status}, Remaining: ${resA5.remaining}`);

  const resA6 = await requestLogin(IP_ALPHA); // Attempt 6 (exceeded)
  console.log(`  IP_ALPHA Attempt 6: HTTP ${resA6.status}, Body: ${JSON.stringify(resA6.body)}, Retry-After: ${resA6.retryAfter}s`);

  if (resA6.status !== 429) {
    throw new Error(`FAIL: Expected HTTP 429, got HTTP ${resA6.status}`);
  }
  if (!resA6.retryAfter) {
    throw new Error('FAIL: Missing Retry-After header on HTTP 429 response');
  }
  console.log('  -> PASS: HTTP 429 successfully returned on threshold breach with Retry-After header.\n');

  // Test 4: Verify IP_BETA is still NOT blocked
  console.log('[Test 4] Verifying unexhausted IP_BETA remains unblocked...');
  const resB2 = await requestLogin(IP_BETA);
  console.log(`  IP_BETA Attempt 2: HTTP ${resB2.status}, Remaining: ${resB2.remaining}`);

  if (resB2.status === 429) {
    throw new Error('FAIL: IP_BETA was falsely blocked when IP_ALPHA was locked out!');
  }
  if (Number(resB2.remaining) !== 3) {
    throw new Error(`FAIL: IP_BETA counter incorrect! Expected 3, got ${resB2.remaining}`);
  }
  console.log('  -> PASS: IP_BETA remains completely unaffected by IP_ALPHA lock-out.\n');

  // Test 5: Verify other endpoints remain accessible for IP_ALPHA
  console.log('[Test 5] Verifying other endpoints remain accessible for locked-out IP_ALPHA...');
  const dirRes = await fetch(`${BASE_URL}/api/schools/directory`, {
    headers: { 'x-simulated-ip': IP_ALPHA }
  });
  console.log(`  IP_ALPHA GET /api/schools/directory: HTTP ${dirRes.status}`);
  if (dirRes.status !== 200) {
    throw new Error(`FAIL: School directory returned HTTP ${dirRes.status} instead of 200 for IP_ALPHA`);
  }
  console.log('  -> PASS: Endpoint-scoped isolation verified.\n');

  // Test 6: Verify production safety (simulated IP strictly ignored when NODE_ENV === 'production')
  console.log('[Test 6] Verifying production safety (NODE_ENV=production ignores simulated IP)...');
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const { getClientIp } = await import('../src/lib/rate-limit.ts');
    const mockReq = new Request('http://localhost:3000/api/auth/login', {
      headers: {
        'x-simulated-ip': '8.8.8.8',
        'x-forwarded-for': '203.0.113.199'
      }
    });
    const resolvedIp = getClientIp(mockReq);
    console.log(`  Production Mode Resolved IP: ${resolvedIp}`);
    if (resolvedIp === '8.8.8.8') {
      throw new Error('FAIL: Production environment accepted x-simulated-ip!');
    }
    if (resolvedIp !== '203.0.113.199') {
      throw new Error(`FAIL: Production environment did not resolve trusted proxy header! Expected 203.0.113.199, got ${resolvedIp}`);
    }
    console.log('  -> PASS: Production environment strictly ignores simulated IP headers.\n');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }

  console.log('==================================================');
  console.log('SUCCESS: All 6 Multi-IP Verification Tests Passed!');
  console.log('==================================================');
}

runSuite().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err.message);
  process.exit(1);
});
