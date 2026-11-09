import { createHash } from 'crypto';

/**
 * Checks HIBP Pwned Passwords via k-Anonymity (Server route handlers only).
 * Never exposes the plain-text password or full hash over the network.
 */
export async function checkPwnedPassword(password: string): Promise<{ isPwned: boolean; count: number }> {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) return { isPwned: false, count: 0 };

    const body = await res.text();
    for (const line of body.split('\r\n')) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix?.trim() === suffix) {
        return { isPwned: true, count: parseInt(countStr || '1', 10) };
      }
    }
    return { isPwned: false, count: 0 };
  } catch {
    return { isPwned: false, count: 0 }; // Fail-open on network timeout to preserve availability
  }
}

