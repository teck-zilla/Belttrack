import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeCallbackNext, resolveCallbackRedirect } from '../src/lib/auth-redirect.ts';

const callbackRoute = await readFile(
  new URL('../src/app/api/auth/callback/route.ts', import.meta.url),
  'utf8'
);

const PROD_REQUEST = 'https://app.example.com/api/auth/callback?code=abc';

test('callback next path stays on the canonical origin', () => {
  assert.equal(normalizeCallbackNext('/dashboard?tab=roll-call#preview'), '/dashboard?tab=roll-call#preview');
  assert.equal(normalizeCallbackNext('https://evil.example/steal'), '/');
  assert.equal(normalizeCallbackNext('//evil.example/steal'), '/');
  assert.equal(normalizeCallbackNext('/\\evil.example'), '/');
  assert.equal(normalizeCallbackNext('/dashboard\nSet-Cookie:bad'), '/');
});

test('callback redirects prefer the configured canonical site URL', () => {
  assert.equal(
    resolveCallbackRedirect({
      requestUrl: PROD_REQUEST,
      next: '/dashboard',
      siteUrl: 'https://belttrack.vercel.app/',
      vercelUrl: 'belttrack-git-main.vercel.app',
      nodeEnv: 'production'
    }),
    'https://belttrack.vercel.app/dashboard'
  );
});

test('callback redirects use a safe origin fallback', () => {
  assert.equal(
    resolveCallbackRedirect({
      requestUrl: PROD_REQUEST,
      next: '/dashboard',
      nodeEnv: 'production'
    }),
    'https://app.example.com/dashboard'
  );
  assert.equal(
    resolveCallbackRedirect({
      requestUrl: 'http://app.example.com/api/auth/callback',
      next: '/dashboard',
      nodeEnv: 'production'
    }),
    null
  );
  assert.equal(
    resolveCallbackRedirect({
      requestUrl: 'http://localhost:3000/api/auth/callback',
      next: '/dashboard',
      nodeEnv: 'development'
    }),
    'http://localhost:3000/dashboard'
  );
});

test('callback route never trusts forwarded host', () => {
  assert.doesNotMatch(callbackRoute, /x-forwarded-host/i);
  assert.match(callbackRoute, /resolveCallbackRedirect/);
  assert.match(callbackRoute, /auth_error=invalid_redirect/);
});
