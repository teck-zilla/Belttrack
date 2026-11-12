import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRateLimitConfig, checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // 1. IP Rate Limiting Evaluation
  const rateLimitRule = getRateLimitConfig(pathname, method);
  const rateLimitHeaders: Record<string, string> = {};

  if (rateLimitRule) {
    const clientIp = getClientIp(request);
    const rateLimitKey = `${clientIp}:${rateLimitRule.key}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, rateLimitRule);

    if (!rateLimitResult.success) {
      return NextResponse.json(
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
    }

    rateLimitHeaders['X-RateLimit-Limit'] = rateLimitResult.limit.toString();
    rateLimitHeaders['X-RateLimit-Remaining'] = rateLimitResult.remaining.toString();
    rateLimitHeaders['X-RateLimit-Reset'] = rateLimitResult.reset.toString();
  }

  // 2. CSRF Origin Protection for State-Changing API Mutations
  const isApiRoute = pathname.startsWith('/api/');
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isApiRoute && isMutation) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { error: 'Cross-origin request blocked (CSRF protection)' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid Origin header' },
          { status: 403 }
        );
      }
    }
  }

  // 3. Supabase Auth Session Refreshing
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Attach rate limit headers to downstream response
  Object.entries(rateLimitHeaders).forEach(([headerName, headerValue]) => {
    supabaseResponse.headers.set(headerName, headerValue);
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        Object.entries(rateLimitHeaders).forEach(([headerName, headerValue]) => {
          supabaseResponse.headers.set(headerName, headerValue);
        });
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
