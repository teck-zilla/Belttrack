/**
 * Next.js instrumentation hook.
 * Runs once when a server instance boots, never during the client bundle.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { validateEnvironment } = await import('./lib/env-validation');
  validateEnvironment();
}
