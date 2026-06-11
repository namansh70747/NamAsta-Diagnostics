import { describe, it, expect } from 'vitest';
import {
  computeCalculated,
  computeGFR,
  roundToDecimals,
  formatResult,
  type ResultMap,
} from '@/lib/calc';

// Helper: most formulas key off `code`; `formula` string is unused for known codes.
const calc = (code: string, values: ResultMap) => computeCalculated(code, '', values);

describe('computeCalculated', () => {
  describe('BBI = max(0, BBT - BBD)', () => {
    it('computes difference', () => {
      expect(calc('BBI', { BBT: 1.2, BBD: 0.3 })).toBeCloseTo(0.9);
    });
    it('clamps to 0 when negative', () => {
      expect(calc('BBI', { BBT: 0.3, BBD: 1.0 })).toBe(0);
    });
    it('returns null when an input is missing', () => {
      expect(calc('BBI', { BBT: 1.2 })).toBeNull();
      expect(calc('BBI', { BBD: 0.3 })).toBeNull();
      expect(calc('BBI', {})).toBeNull();
    });
  });

  describe('GLO = TPN - ALB', () => {
    it('computes difference', () => {
      expect(calc('GLO', { TPN: 7.5, ALB: 4.0 })).toBeCloseTo(3.5);
    });
    it('returns null when an input is missing', () => {
      expect(calc('GLO', { TPN: 7.5 })).toBeNull();
      expect(calc('GLO', { ALB: 4.0 })).toBeNull();
    });
  });

  describe('BAG = ALB / GLO', () => {
    it('computes ratio', () => {
      expect(calc('BAG', { ALB: 4.0, GLO: 2.0 })).toBeCloseTo(2.0);
    });
    it('returns null on division by zero (never NaN)', () => {
      const v = calc('BAG', { ALB: 4.0, GLO: 0 });
      expect(v).toBeNull();
      expect(Number.isNaN(v as number)).toBe(false);
    });
    it('returns null when missing', () => {
      expect(calc('BAG', { ALB: 4.0 })).toBeNull();
      expect(calc('BAG', { GLO: 2.0 })).toBeNull();
    });
  });

  describe('BVLDL = TG / 5', () => {
    it('computes', () => {
      expect(calc('BVLDL', { TG: 150 })).toBeCloseTo(30);
    });
    it('returns null when TG missing', () => {
      expect(calc('BVLDL', {})).toBeNull();
    });
  });

  describe('NHDL = CHOL - BHDL', () => {
    it('computes', () => {
      expect(calc('NHDL', { CHOL: 200, BHDL: 50 })).toBeCloseTo(150);
    });
    it('returns null when missing', () => {
      expect(calc('NHDL', { CHOL: 200 })).toBeNull();
      expect(calc('NHDL', { BHDL: 50 })).toBeNull();
    });
  });

  describe('BLDL (Friedewald) = CHOL - BHDL - TG/5', () => {
    it('computes when TG <= 400', () => {
      expect(calc('BLDL', { CHOL: 200, BHDL: 50, TG: 150 })).toBeCloseTo(120);
    });
    it('is suppressed (null) when TG > 400', () => {
      expect(calc('BLDL', { CHOL: 200, BHDL: 50, TG: 401 })).toBeNull();
    });
    it('still computes at exactly TG = 400', () => {
      expect(calc('BLDL', { CHOL: 200, BHDL: 50, TG: 400 })).toBeCloseTo(70);
    });
    it('returns null when any input missing', () => {
      expect(calc('BLDL', { CHOL: 200, BHDL: 50 })).toBeNull();
      expect(calc('BLDL', { CHOL: 200, TG: 150 })).toBeNull();
      expect(calc('BLDL', { BHDL: 50, TG: 150 })).toBeNull();
    });
  });

  describe('BRAT = CHOL / BHDL', () => {
    it('computes ratio', () => {
      expect(calc('BRAT', { CHOL: 200, BHDL: 50 })).toBeCloseTo(4.0);
    });
    it('returns null on division by zero', () => {
      expect(calc('BRAT', { CHOL: 200, BHDL: 0 })).toBeNull();
    });
    it('returns null when missing', () => {
      expect(calc('BRAT', { CHOL: 200 })).toBeNull();
    });
  });

  describe('BLHR = BLDL / BHDL', () => {
    it('computes ratio', () => {
      expect(calc('BLHR', { BLDL: 120, BHDL: 60 })).toBeCloseTo(2.0);
    });
    it('returns null on division by zero', () => {
      expect(calc('BLHR', { BLDL: 120, BHDL: 0 })).toBeNull();
    });
    it('returns null when missing', () => {
      expect(calc('BLHR', { BHDL: 60 })).toBeNull();
    });
  });

  describe('EAG = 28.7 * HBA1C - 46.7', () => {
    it('computes', () => {
      expect(calc('EAG', { HBA1C: 7 })).toBeCloseTo(28.7 * 7 - 46.7);
    });
    it('returns null when HBA1C missing', () => {
      expect(calc('EAG', {})).toBeNull();
    });
  });

  describe('BUN = UREA * 0.467', () => {
    it('computes', () => {
      expect(calc('BUN', { UREA: 40 })).toBeCloseTo(40 * 0.467);
    });
    it('returns null when UREA missing', () => {
      expect(calc('BUN', {})).toBeNull();
    });
  });

  describe('INR = PT_PT / 12', () => {
    it('computes', () => {
      expect(calc('INR', { PT_PT: 24 })).toBeCloseTo(2.0);
    });
    it('returns null when PT_PT missing', () => {
      expect(calc('INR', {})).toBeNull();
    });
  });

  describe('null-valued inputs never yield NaN', () => {
    it('treats explicit null like missing', () => {
      expect(calc('BBI', { BBT: null, BBD: null })).toBeNull();
      expect(calc('GLO', { TPN: null, ALB: 4 })).toBeNull();
      const v = calc('BAG', { ALB: null, GLO: null });
      expect(v).toBeNull();
      expect(Number.isNaN(v as number)).toBe(false);
    });
  });

  describe('GFR code returns null (computed separately)', () => {
    it('returns null', () => {
      expect(calc('GFR', { CREAT: 1.0 })).toBeNull();
    });
  });

  describe('fallback formula evaluation', () => {
    it('evaluates a simple arithmetic formula', () => {
      expect(computeCalculated('UNKNOWN', 'BBT - BBD', { BBT: 5, BBD: 2 })).toBeCloseTo(3);
    });
    it('returns null when a referenced value is missing', () => {
      expect(computeCalculated('UNKNOWN', 'BBT - BBD', { BBT: 5 })).toBeNull();
    });
    it('returns null when there is no formula', () => {
      expect(computeCalculated('UNKNOWN', '', { BBT: 5 })).toBeNull();
    });
  });
});

describe('computeGFR (CKD-EPI 2021)', () => {
  it('returns a positive rounded integer for valid male inputs', () => {
    const g = computeGFR(1.0, 40, 'MALE');
    expect(g).not.toBeNull();
    expect(g).toBeGreaterThan(0);
    expect(Number.isInteger(g as number)).toBe(true);
  });
  it('returns a positive rounded integer for valid female inputs', () => {
    const g = computeGFR(0.8, 35, 'FEMALE');
    expect(g).not.toBeNull();
    expect(g).toBeGreaterThan(0);
    expect(Number.isInteger(g as number)).toBe(true);
  });
  it('female factor yields a different (higher) value than male, same cre/age', () => {
    const male = computeGFR(0.8, 50, 'MALE') as number;
    const female = computeGFR(0.8, 50, 'FEMALE') as number;
    expect(female).not.toEqual(male);
  });
  it('returns null when creatinine <= 0', () => {
    expect(computeGFR(0, 40, 'MALE')).toBeNull();
    expect(computeGFR(-1, 40, 'MALE')).toBeNull();
  });
  it('returns null when age <= 0', () => {
    expect(computeGFR(1.0, 0, 'MALE')).toBeNull();
  });
});

describe('roundToDecimals', () => {
  it('rounds to given decimals', () => {
    expect(roundToDecimals(3.14159, 2)).toBe(3.14);
    expect(roundToDecimals(3.145, 2)).toBe(3.15);
    expect(roundToDecimals(2.5, 0)).toBe(3);
  });
  it('handles zero decimals', () => {
    expect(roundToDecimals(123.456, 0)).toBe(123);
  });
});

describe('formatResult', () => {
  it('returns empty string for null', () => {
    expect(formatResult(null, 2)).toBe('');
  });
  it('formats with fixed decimals', () => {
    expect(formatResult(3.1, 2)).toBe('3.10');
    expect(formatResult(3.14159, 2)).toBe('3.14');
    expect(formatResult(5, 0)).toBe('5');
  });
});
