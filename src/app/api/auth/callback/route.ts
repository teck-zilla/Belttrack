import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCallbackRedirect } from '@/lib/auth-redirect';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const destination = resolveCallbackRedirect({
    requestUrl: request.url,
    next,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
    nodeEnv: process.env.NODE_ENV
  });

  if (!destination) {
    return NextResponse.redirect(new URL('/?auth_error=invalid_redirect', request.url));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(new URL('/?auth_error=verification_failed', request.url));
}
