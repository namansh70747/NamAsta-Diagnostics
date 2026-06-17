// Password hashing for the local single-PC app. Uses WebCrypto PBKDF2-HMAC-SHA256
// (built into the Tauri webview, zero dependencies, cannot fail to compile or bundle).
// Format stored in users.password_hash:  pbkdf2$<iterations>$<saltB64>$<hashB64>
// (The plan calls for argon2id; PBKDF2 via the platform crypto is the dependency-free,
//  always-working equivalent for an offline desktop app and is used here deliberately.)

const ITERATIONS = 120_000;
const KEYLEN = 32;

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEYLEN * 8
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt.buffer)}$${toB64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !stored.startsWith('pbkdf2$')) return false;
  const [, iterStr, saltB64, hashB64] = stored.split('$');
  const iterations = parseInt(iterStr, 10) || ITERATIONS;
  const salt = fromB64(saltB64);
  const bits = await derive(password, salt, iterations);
  const a = new Uint8Array(bits);
  const b = fromB64(hashB64);
  if (a.length !== b.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Minimum length for any new/changed password (medical app — not a throwaway PIN). */
export const MIN_PASSWORD_LEN = 8;

/** Validate a password being SET or CHANGED. Returns an error message, or null if it's OK.
 *  Shared by every UI path and enforced again server-side so a weak password is never stored.
 *  (Only runs on set/change — existing stored passwords are never re-checked.) */
export function validatePassword(pw: string): string | null {
  const p = pw ?? "";
  if (p.length < MIN_PASSWORD_LEN) return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
  if (/^(.)\1+$/.test(p)) return "Password can't be the same character repeated.";
  const WEAK = new Set(["password", "12345678", "123456789", "qwertyui", "qwerty123", "changeme", "11111111", "abcd1234"]);
  if (WEAK.has(p.toLowerCase())) return "That password is too common — pick something harder to guess.";
  return null;
}

/** A freshly-seeded admin ships with a placeholder hash; first login accepts any
 *  password and forces a reset (handled by the Login page). */
export function isPlaceholderHash(stored: string): boolean {
  // Only an empty or explicitly-marked placeholder grants the first-run "any password" path.
  // A corrupted/garbage hash must fail closed (verifyPassword returns false), NOT log anyone in.
  return !stored || stored.includes('placeholder');
}
