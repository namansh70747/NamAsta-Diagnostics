import { TestRange, ResultType } from '@/types';

export function computeFlag(
  resultType: ResultType,
  value: string,
  ranges: TestRange[],
  patientSex: 'MALE' | 'FEMALE' | 'OTHER',
  patientAgeDays: number
): '' | 'H' | 'L' | 'A' {
  if (!value || !value.trim()) return '';

  if (resultType === 'numeric' || resultType === 'calculated') {
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return '';

    const range = findRange(ranges, patientSex, patientAgeDays);
    if (!range) return '';

    if (range.high != null && num > range.high) return 'H';
    if (range.low != null && num < range.low) return 'L';
    return '';
  }

  if (resultType === 'choice' || resultType === 'text') {
    // Abnormal qualitative: flag if not the normal value
    const normalValues = ['NEGATIVE', 'NIL', 'NOT SEEN', 'ABSENT', 'NORMAL', 'CLEAR', 'PALE YELLOW'];
    const upper = value.toUpperCase().trim();
    if (normalValues.includes(upper)) return '';
    // Check if range_text says Negative/Nil/etc.
    const range = findRange(ranges, patientSex, patientAgeDays);
    if (range?.range_text) {
      const rt = range.range_text.toUpperCase();
      if (['NEGATIVE', 'NIL', 'NOT SEEN', 'ABSENT', 'NORMAL'].includes(rt) && upper !== rt) {
        return 'A';
      }
    }
    return '';
  }

  return '';
}

export function findRange(
  ranges: TestRange[],
  sex: 'MALE' | 'FEMALE' | 'OTHER',
  ageDays: number
): TestRange | null {
  const sexMap: Record<string, 'M' | 'F' | 'ANY'> = {
    MALE: 'M', FEMALE: 'F', OTHER: 'ANY'
  };
  const s = sexMap[sex] || 'ANY';

  // Sex-specific first, then ANY. Never fall back to the OTHER sex's range — applying the
  // wrong sex's limits would produce a clinically wrong H/L flag.
  const candidates = ranges.filter(r =>
    ageDays >= r.age_min_days && ageDays <= r.age_max_days
  );

  const exact = candidates.find(r => r.sex === s);
  if (exact) return exact;
  const anyRow = candidates.find(r => r.sex === 'ANY');
  if (anyRow) return anyRow;

  // 'Other'-sex patient with only male/female ranges: don't apply one sex's limits — widen to
  // the union (flag only if outside BOTH sexes' ranges) rather than picking an arbitrary sex.
  if (s === 'ANY' && candidates.length) {
    const lows = candidates.map(r => r.low).filter((v): v is number => v != null);
    const highs = candidates.map(r => r.high).filter((v): v is number => v != null);
    return {
      ...candidates[0],
      sex: 'ANY',
      low: lows.length ? Math.min(...lows) : null,
      high: highs.length ? Math.max(...highs) : null,
      range_text: null,
    };
  }
  return null;
}

/** The printed "Normal Ranges" string for a patient. Prefers the exact stored
 *  range_text; otherwise synthesises from low/high so the report is never blank. */
export function displayRange(r: TestRange | null): string {
  if (!r) return '';
  if (r.range_text && r.range_text.trim()) return r.range_text.trim();
  const sexTag = r.sex === 'M' ? ' (M)' : r.sex === 'F' ? ' (F)' : '';
  if (r.low != null && r.high != null) return `${r.low} - ${r.high}${sexTag}`;
  if (r.high != null) return `< ${r.high}${sexTag}`;
  if (r.low != null) return `> ${r.low}${sexTag}`;
  return '';
}

/** Parse a free-typed normal-range string ("2 - 8", "2-8", "< 8", "> 2", "0.5 – 1.2")
 *  into low/high so an overridden range can still produce a correct H/L flag.
 *  Returns null if it isn't a recognisable numeric range. */
export function parseRange(text: string): { low: number | null; high: number | null } | null {
  if (!text) return null;
  const t = text.replace(/–|—/g, '-').trim();   // normalise en/em dashes to hyphen
  let m = t.match(/^([0-9]*\.?[0-9]+)\s*-\s*([0-9]*\.?[0-9]+)/);
  if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]) };
  m = t.match(/^<\s*=?\s*([0-9]*\.?[0-9]+)/);
  if (m) return { low: null, high: parseFloat(m[1]) };
  m = t.match(/^>\s*=?\s*([0-9]*\.?[0-9]+)/);
  if (m) return { low: parseFloat(m[1]), high: null };
  return null;
}

/** Build the range array to flag against, honouring a per-order override when present.
 *  Falls back to the test's stored ranges if the override isn't numerically parseable. */
export function rangesWithOverride(ranges: TestRange[], override: string | null | undefined): TestRange[] {
  if (override && override.trim()) {
    const p = parseRange(override);
    if (p) return [{
      id: -1, test_id: -1, sex: 'ANY', age_min_days: 0, age_max_days: 54750,
      low: p.low, high: p.high, range_text: override.trim(), unit: null, band_text: null,
    } as TestRange];
  }
  return ranges;
}

export function patientAgeDays(age: number, ageUnit: 'YRS' | 'MTH' | 'DAYS'): number {
  switch (ageUnit) {
    case 'YRS': return Math.round(age * 365.25);
    case 'MTH': return Math.round(age * 30.44);
    case 'DAYS': return age;
    default: return Math.round(age * 365.25);   // unexpected unit → treat as years
  }
}
