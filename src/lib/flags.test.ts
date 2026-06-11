import { describe, it, expect } from 'vitest';
import { computeFlag, patientAgeDays } from '@/lib/flags';
import type { TestRange } from '@/types';

// Factory for TestRange with sensible defaults (covers all ages by default).
function makeRange(overrides: Partial<TestRange> = {}): TestRange {
  return {
    id: 1,
    test_id: 1,
    sex: 'ANY',
    age_min_days: 0,
    age_max_days: 200000, // ~547 years, effectively "any age"
    low: null,
    high: null,
    range_text: null,
    band_text: null,
    ...overrides,
  };
}

const ADULT_DAYS = patientAgeDays(40, 'YRS');

describe('computeFlag — numeric', () => {
  const ranges = [makeRange({ low: 13.5, high: 17.5 })];

  it('flags H when value above high', () => {
    expect(computeFlag('numeric', '18.0', ranges, 'MALE', ADULT_DAYS)).toBe('H');
  });
  it('flags L when value below low', () => {
    expect(computeFlag('numeric', '12.0', ranges, 'MALE', ADULT_DAYS)).toBe('L');
  });
  it('no flag when within range', () => {
    expect(computeFlag('numeric', '15.0', ranges, 'MALE', ADULT_DAYS)).toBe('');
  });
  it('no flag at exact boundaries (inclusive)', () => {
    expect(computeFlag('numeric', '13.5', ranges, 'MALE', ADULT_DAYS)).toBe('');
    expect(computeFlag('numeric', '17.5', ranges, 'MALE', ADULT_DAYS)).toBe('');
  });
  it('returns empty for blank/whitespace value', () => {
    expect(computeFlag('numeric', '', ranges, 'MALE', ADULT_DAYS)).toBe('');
    expect(computeFlag('numeric', '   ', ranges, 'MALE', ADULT_DAYS)).toBe('');
  });
  it('returns empty for non-numeric value', () => {
    expect(computeFlag('numeric', 'abc', ranges, 'MALE', ADULT_DAYS)).toBe('');
  });
  it('returns empty when no matching range found', () => {
    expect(computeFlag('numeric', '99', [], 'MALE', ADULT_DAYS)).toBe('');
  });
  it('flags only on low when only low defined', () => {
    const r = [makeRange({ low: 10, high: null })];
    expect(computeFlag('numeric', '5', r, 'MALE', ADULT_DAYS)).toBe('L');
    expect(computeFlag('numeric', '1000', r, 'MALE', ADULT_DAYS)).toBe('');
  });
  it('flags only on high when only high defined', () => {
    const r = [makeRange({ low: null, high: 100 })];
    expect(computeFlag('numeric', '200', r, 'MALE', ADULT_DAYS)).toBe('H');
    expect(computeFlag('numeric', '0', r, 'MALE', ADULT_DAYS)).toBe('');
  });
});

describe('computeFlag — sex-specific range selection', () => {
  // Haemoglobin: M 13.5-17.5, F 12.0-16.0
  const ranges = [
    makeRange({ id: 1, sex: 'M', low: 13.5, high: 17.5 }),
    makeRange({ id: 2, sex: 'F', low: 12.0, high: 16.0 }),
  ];

  it('12.5 is L for male (picks M row 13.5-17.5)', () => {
    expect(computeFlag('numeric', '12.5', ranges, 'MALE', ADULT_DAYS)).toBe('L');
  });
  it('12.5 is normal for female (picks F row 12.0-16.0)', () => {
    expect(computeFlag('numeric', '12.5', ranges, 'FEMALE', ADULT_DAYS)).toBe('');
  });
  it('OTHER falls back to ANY row when present', () => {
    const r = [
      makeRange({ id: 1, sex: 'M', low: 13.5, high: 17.5 }),
      makeRange({ id: 3, sex: 'ANY', low: 10, high: 20 }),
    ];
    // OTHER -> ANY: 12.5 within 10-20 -> no flag
    expect(computeFlag('numeric', '12.5', r, 'OTHER', ADULT_DAYS)).toBe('');
  });
  it('falls back to ANY when sex-specific row absent', () => {
    const r = [makeRange({ id: 3, sex: 'ANY', low: 10, high: 20 })];
    expect(computeFlag('numeric', '5', r, 'MALE', ADULT_DAYS)).toBe('L');
  });
});

describe('computeFlag — age-window selection', () => {
  // Two age bands: infant (0-365d) low/high vs adult.
  const ranges = [
    makeRange({ id: 1, sex: 'ANY', age_min_days: 0, age_max_days: 365, low: 9, high: 14 }),
    makeRange({ id: 2, sex: 'ANY', age_min_days: 366, age_max_days: 200000, low: 13.5, high: 17.5 }),
  ];

  it('selects infant band for a 100-day-old', () => {
    // 13 is within infant band 9-14 -> no flag
    expect(computeFlag('numeric', '13', ranges, 'MALE', 100)).toBe('');
  });
  it('selects adult band for a 40-year-old', () => {
    // 13 is below adult low 13.5 -> L
    expect(computeFlag('numeric', '13', ranges, 'MALE', ADULT_DAYS)).toBe('L');
  });
  it('returns empty when age falls outside all bands', () => {
    const r = [makeRange({ age_min_days: 0, age_max_days: 30, low: 1, high: 2 })];
    expect(computeFlag('numeric', '100', r, 'MALE', ADULT_DAYS)).toBe('');
  });
});

describe('computeFlag — Indian number format parsing', () => {
  // Platelets normal 150000-450000
  const ranges = [makeRange({ low: 150000, high: 450000 })];

  it('parses "1,68,000" and flags no abnormality (in range)', () => {
    expect(computeFlag('numeric', '1,68,000', ranges, 'MALE', ADULT_DAYS)).toBe('');
  });
  it('parses "1,20,000" as below range -> L', () => {
    expect(computeFlag('numeric', '1,20,000', ranges, 'MALE', ADULT_DAYS)).toBe('L');
  });
  it('parses "5,00,000" as above range -> H', () => {
    expect(computeFlag('numeric', '5,00,000', ranges, 'MALE', ADULT_DAYS)).toBe('H');
  });
});

describe('computeFlag — qualitative (choice/text)', () => {
  const normalRangeText = makeRange({ range_text: 'NEGATIVE' });

  it.each(['NEGATIVE', 'NIL', 'NOT SEEN', 'ABSENT', 'NORMAL', 'CLEAR', 'PALE YELLOW'])(
    'returns empty for normal value %s',
    (val: string) => {
      expect(computeFlag('choice', val, [normalRangeText], 'MALE', ADULT_DAYS)).toBe('');
    }
  );

  it('is case-insensitive for normal values', () => {
    expect(computeFlag('choice', 'negative', [normalRangeText], 'MALE', ADULT_DAYS)).toBe('');
  });

  it("returns 'A' for abnormal value when range_text marks normal", () => {
    expect(computeFlag('choice', 'POSITIVE', [normalRangeText], 'MALE', ADULT_DAYS)).toBe('A');
  });

  it("text result type behaves like choice ('A' when abnormal vs normal range_text)", () => {
    expect(computeFlag('text', 'PRESENT', [makeRange({ range_text: 'ABSENT' })], 'MALE', ADULT_DAYS)).toBe('A');
  });

  it('returns empty when no range_text to compare against', () => {
    expect(computeFlag('choice', 'POSITIVE', [makeRange({ range_text: null })], 'MALE', ADULT_DAYS)).toBe('');
  });

  it('returns empty for blank qualitative value', () => {
    expect(computeFlag('choice', '', [normalRangeText], 'MALE', ADULT_DAYS)).toBe('');
  });

  // NOTE: spec says normal values like CLEAR/PALE YELLOW are "normal", but the
  // 'A' check only fires when range_text is one of NEGATIVE/NIL/NOT SEEN/ABSENT/NORMAL.
  // range_text values CLEAR / PALE YELLOW are NOT in that abnormal-trigger set, so an
  // off-normal value reported against them yields '' (no flag) per current impl.
  it("does not flag 'A' when range_text is CLEAR even for an off value (impl behavior)", () => {
    expect(computeFlag('choice', 'TURBID', [makeRange({ range_text: 'CLEAR' })], 'MALE', ADULT_DAYS)).toBe('');
  });
});

describe('patientAgeDays', () => {
  it('converts YRS', () => {
    expect(patientAgeDays(40, 'YRS')).toBe(Math.round(40 * 365.25));
    expect(patientAgeDays(1, 'YRS')).toBe(Math.round(365.25));
  });
  it('converts MTH', () => {
    expect(patientAgeDays(6, 'MTH')).toBe(Math.round(6 * 30.44));
  });
  it('converts DAYS as identity', () => {
    expect(patientAgeDays(10, 'DAYS')).toBe(10);
    expect(patientAgeDays(0, 'DAYS')).toBe(0);
  });
});
