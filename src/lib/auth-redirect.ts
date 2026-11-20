export interface CallbackRedirectOptions {
  requestUrl: string;
  next?: string | null;
  siteUrl?: string | null;
  vercelUrl?: string | null;
  nodeEnv?: string | null;
}

function httpsOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function normalizeCallbackNext(next: string | null | undefined): string {
  if (!next) return '/';
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(next)
  ) {
    return '/';
  }

  try {
    const parsed = new URL(next, 'https://redirect.invalid');
    if (parsed.origin !== 'https://redirect.invalid') return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export function resolveCallbackRedirect(options: CallbackRedirectOptions): string | null {
  const request = new URL(options.requestUrl);
  const isProduction = options.nodeEnv === 'production';
  const requestOrigin = isProduction
    ? request.protocol === 'https:'
      ? request.origin
      : null
    : request.origin;
  const canonicalOrigin = httpsOrigin(options.siteUrl) ?? httpsOrigin(options.vercelUrl) ?? requestOrigin;

  if (!canonicalOrigin) return null;
  return `${canonicalOrigin}${normalizeCallbackNext(options.next)}`;
}
