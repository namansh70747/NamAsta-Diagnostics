/**
 * SQLite's CURRENT_TIMESTAMP returns UTC as "YYYY-MM-DD HH:MM:SS" with NO timezone
 * marker. `new Date()` parses that space-separated form as *local* time, which shifts
 * the displayed day (the off-by-one "Report DATE" bug). Normalise such values to
 * explicit UTC so every timestamp converts to local time correctly and consistently.
 */
export function parseDbDate(dt: string): Date {
  if (!dt) return new Date(NaN);
  if (dt.includes('T')) return new Date(dt); // already ISO (e.g. nowISO())
  // SQLite UTC forms: "YYYY-MM-DD HH:MM:SS" (optionally fractional) or bare "YYYY-MM-DD".
  // A bare date parsed by `new Date()` is UTC, but the space+time form is LOCAL — the
  // exact off-by-one this normalises. Pin both to explicit UTC.
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ ](\d{2}:\d{2}:\d{2}))?/.exec(dt);
  if (m) return new Date(`${m[1]}T${m[2] ?? '00:00:00'}Z`);
  return new Date(dt);
}

export function formatDate(dt: string | null): string {
  if (!dt) return '—';
  const d = parseDbDate(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dt: string | null): string {
  if (!dt) return '—';
  const d = parseDbDate(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayDateISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function ageDisplay(age: number, unit: string): string {
  return `${age} ${unit}`;
}

/** Human gender label. A newborn (baby=1) reads as "Baby Boy"/"Baby Girl"; sex itself stays
 *  MALE/FEMALE so reference-range and eGFR lookups are unaffected. */
export function genderLabel(sex: string | null | undefined, baby?: number | null): string {
  if (baby) return sex === 'FEMALE' ? 'Baby Girl' : 'Baby Boy';
  return sex === 'MALE' ? 'Male' : sex === 'FEMALE' ? 'Female' : 'Other';
}
