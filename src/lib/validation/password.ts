export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrengthResult {
  score: 1 | 2 | 3 | 4; // 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  colorClass: string;
}

/**
 * Calculates password strength based on length, character diversity, and passphrase structure.
 * Client and server safe (zero Node.js built-in dependencies).
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password || password.length < 15) {
    return { score: 1, label: 'Weak', colorClass: 'bg-error' };
  }

  let score = 1;

  // Length milestones
  if (password.length >= 20) score += 1;
  if (password.length >= 28) score += 1;

  // Character diversity checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasSpaces = /\s/.test(password);

  const diversityCount = [hasLower, hasUpper, hasNumber, hasSpecial, hasSpaces].filter(Boolean).length;
  if (diversityCount >= 3) score += 1;
  if (diversityCount >= 4) score += 1;

  const normalizedScore = Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
  const labelMap = { 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' } as const;
  const colorMap = { 1: 'bg-error', 2: 'bg-tertiary', 3: 'bg-primary', 4: 'bg-primary' } as const;

  return {
    score: normalizedScore,
    label: labelMap[normalizedScore],
    colorClass: colorMap[normalizedScore]
  };
}

/**
 * Rejects predictable sequences, excessive repetition, and personal info in passwords.
 */
export function checkPredictablePassword(
  password: string,
  userContext?: { email?: string; name?: string }
): { isPredictable: boolean; reason?: string } {
  // 1. Repetitive characters (e.g. "aaaaaaaaaaaaaaa" or "111111111111111")
  if (/(.)\1{5,}/.test(password)) {
    return { isPredictable: true, reason: 'Password contains too many consecutive repeated characters.' };
  }

  // 2. Trivial sequential runs
  const sequentialPatterns = ['123456789', 'abcdefgh', 'qwertyuiop', 'asdfghjkl'];
  const lower = password.toLowerCase();
  for (const pattern of sequentialPatterns) {
    if (lower.includes(pattern)) {
      return { isPredictable: true, reason: 'Password contains a predictable sequence of characters.' };
    }
  }

  // 3. User email prefix check
  if (userContext?.email) {
    const handle = userContext.email.split('@')[0]?.toLowerCase();
    if (handle && handle.length >= 4 && lower.includes(handle)) {
      return { isPredictable: true, reason: 'Password must not contain your email username.' };
    }
  }

  // 4. User full name check
  if (userContext?.name) {
    const parts = userContext.name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    for (const part of parts) {
      if (lower.includes(part)) {
        return { isPredictable: true, reason: 'Password must not contain parts of your name.' };
      }
    }
  }

  return { isPredictable: false };
}
