// Pure validation + money helpers for the New Patient screen (spec §7.3).
// Dependency-free and pure: same inputs always yield same outputs.

export type AgeUnit = 'YRS' | 'MTH' | 'DAYS';

/**
 * Validate patient age. Returns null when valid, otherwise an error string.
 * - Age must be > 0, except newborns measured in DAYS where 0 is allowed.
 * - In YRS, age cannot exceed 120 years.
 */
export function validateAge(age: number, unit: AgeUnit): string | null {
  if (age == null || Number.isNaN(age)) return 'Age is required';
  if (unit === 'DAYS') {
    if (age < 0) return 'Age cannot be negative';
  } else {
    // YRS or MTH: 0 (or negative) not allowed
    if (age <= 0) return 'Age must be greater than 0';
  }
  if (unit === 'YRS' && age > 120) return 'Age cannot exceed 120 years';
  return null;
}

/**
 * Validate phone. Empty is allowed (warn-but-allow -> returns null).
 * Otherwise must be exactly 10 digits.
 */
export function validatePhone(phone: string): string | null {
  if (!phone || !phone.trim()) return null;
  if (!/^\d{10}$/.test(phone.trim())) return 'Phone must be 10 digits';
  return null;
}

/**
 * Validate email. Empty is allowed. Otherwise must match a basic email regex.
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Invalid email address';
  return null;
}

/**
 * Validate concession against the bill total.
 * - concession cannot be negative.
 * - concession cannot exceed total.
 */
export function validateConcession(concession: number, total: number): string | null {
  if (concession == null || Number.isNaN(concession)) return 'Concession is required';
  if (concession < 0) return 'Concession cannot be negative';
  if (concession > total) return 'Concession cannot exceed total';
  return null;
}

/** Net payable = total - concession, clamped at 0. */
export function computeNet(total: number, concession: number): number {
  return Math.max(0, total - concession);
}

/** Balance = net - received, clamped at 0. */
export function computeBalance(net: number, received: number): number {
  return Math.max(0, net - received);
}

/**
 * Non-blocking warning when received exceeds net payable.
 * Returns null when within bounds.
 */
export function receivedWarning(received: number, net: number): string | null {
  if (received > net) return 'Received exceeds net payable';
  return null;
}
