import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRateLimitConfig, checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { isAuthorizedInternalMutation, isSameOriginMutation } from '@/lib/csrf';

function buildContentSecurityPolicy(nonce: string, isProduction: boolean): string {
  const scriptSrc = isProduction
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    scriptSrc,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:"
  ];

  if (isProduction) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const isProduction = process.env.NODE_ENV === 'production';
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, isProduction);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const applyResponseHeaders = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  };

  // 1. IP Rate Limiting Evaluation
  const rateLimitRule = getRateLimitConfig(pathname, method);
  const rateLimitHeaders: Record<string, string> = {};

  if (rateLimitRule) {
    const clientIp = getClientIp(request);
    const rateLimitKey = `${clientIp}:${rateLimitRule.key}`;
    const rateLimitResult = await checkRateLimitAsync(rateLimitKey, rateLimitRule);

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: rateLimitResult.message },
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
      applyResponseHeaders(response);
      return response;
    }

    rateLimitHeaders['X-RateLimit-Limit'] = rateLimitResult.limit.toString();
    rateLimitHeaders['X-RateLimit-Remaining'] = rateLimitResult.remaining.toString();
    rateLimitHeaders['X-RateLimit-Reset'] = rateLimitResult.reset.toString();
  }

  // 2. CSRF Origin Protection for State-Changing API Mutations
  const isApiRoute = pathname.startsWith('/api/');
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isApiRoute && isMutation && !isAuthorizedInternalMutation(request)) {
    if (!isSameOriginMutation(request)) {
      const response = NextResponse.json(
        { error: 'Cross-origin request blocked (CSRF protection)' },
        { status: 403 }
      );
      applyResponseHeaders(response);
      return response;
    }
  }

  // 3. Supabase Auth Session Refreshing
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach rate limit and CSP headers to downstream response
  Object.entries(rateLimitHeaders).forEach(([headerName, headerValue]) => {
    supabaseResponse.headers.set(headerName, headerValue);
  });
  applyResponseHeaders(supabaseResponse);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        Object.entries(rateLimitHeaders).forEach(([headerName, headerValue]) => {
          supabaseResponse.headers.set(headerName, headerValue);
        });
        applyResponseHeaders(supabaseResponse);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            path: '/',
            sameSite: 'lax',
            secure: isProduction,
            ...options,
          })
        );
      },
    },
  });

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser().
  // getUser() validates the JWT against Supabase Auth and updates cookies if refreshed.
  try {
    await supabase.auth.getUser();
  } catch {
    // Graceful catch: never crash middleware with HTTP 500 on transient auth session refresh errors
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and images:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg / favicon.ico (icon files)
     * - Static assets with image extensions
     */
    '/((?!_next/static|_next/image|favicon\\.svg|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
