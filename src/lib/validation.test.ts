import { describe, it, expect } from 'vitest';
import {
  validateAge,
  validatePhone,
  validateEmail,
  validateConcession,
  computeNet,
  computeBalance,
  receivedWarning,
} from '@/lib/validation';

describe('validateAge', () => {
  it('accepts a normal age in years', () => {
    expect(validateAge(40, 'YRS')).toBeNull();
  });
  it('blocks age 250 in years (exceeds 120)', () => {
    expect(validateAge(250, 'YRS')).toBe('Age cannot exceed 120 years');
  });
  it('accepts exactly 120 years', () => {
    expect(validateAge(120, 'YRS')).toBeNull();
  });
  it('blocks 121 years', () => {
    expect(validateAge(121, 'YRS')).toBe('Age cannot exceed 120 years');
  });
  it('blocks age 0 in years', () => {
    expect(validateAge(0, 'YRS')).toBe('Age must be greater than 0');
  });
  it('blocks age 0 in months', () => {
    expect(validateAge(0, 'MTH')).toBe('Age must be greater than 0');
  });
  it('allows age 0 in days (newborn)', () => {
    expect(validateAge(0, 'DAYS')).toBeNull();
  });
  it('allows positive days', () => {
    expect(validateAge(15, 'DAYS')).toBeNull();
  });
  it('blocks negative days', () => {
    expect(validateAge(-1, 'DAYS')).toBe('Age must be greater than 0');
  });
  it('blocks negative years', () => {
    expect(validateAge(-5, 'YRS')).toBe('Age must be greater than 0');
  });
  it('does not cap months/days at 120 (only YRS caps)', () => {
    expect(validateAge(600, 'MTH')).toBeNull();
    expect(validateAge(5000, 'DAYS')).toBeNull();
  });
  it('rejects NaN age', () => {
    expect(validateAge(NaN, 'YRS')).toBe('Age is required');
  });
});

describe('validatePhone', () => {
  it('allows blank phone (warn-but-allow)', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('   ')).toBeNull();
  });
  it('accepts a 10-digit phone', () => {
    expect(validatePhone('9876543210')).toBeNull();
  });
  it('rejects a 9-digit phone', () => {
    expect(validatePhone('987654321')).toBe('Phone must be 10 digits');
  });
  it('rejects an 11-digit phone', () => {
    expect(validatePhone('98765432101')).toBe('Phone must be 10 digits');
  });
  it('rejects phone with non-digits', () => {
    expect(validatePhone('98765-3210')).toBe('Phone must be 10 digits');
    expect(validatePhone('98765abcde')).toBe('Phone must be 10 digits');
  });
  it('trims surrounding whitespace before validating', () => {
    expect(validatePhone(' 9876543210 ')).toBeNull();
  });
});

describe('validateEmail', () => {
  it('allows blank email', () => {
    expect(validateEmail('')).toBeNull();
    expect(validateEmail('  ')).toBeNull();
  });
  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
    expect(validateEmail('a.b+tag@sub.domain.co')).toBeNull();
  });
  it('rejects malformed emails', () => {
    expect(validateEmail('notanemail')).toBe('Invalid email address');
    expect(validateEmail('foo@bar')).toBe('Invalid email address');
    expect(validateEmail('foo@@bar.com')).toBe('Invalid email address');
    expect(validateEmail('@bar.com')).toBe('Invalid email address');
  });
});

describe('validateConcession', () => {
  it('accepts concession within total', () => {
    expect(validateConcession(100, 500)).toBeNull();
  });
  it('accepts concession equal to total', () => {
    expect(validateConcession(500, 500)).toBeNull();
  });
  it('blocks concession exceeding total', () => {
    expect(validateConcession(600, 500)).toBe('Concession cannot exceed total');
  });
  it('blocks negative concession', () => {
    expect(validateConcession(-1, 500)).toBe('Concession cannot be negative');
  });
  it('accepts zero concession', () => {
    expect(validateConcession(0, 500)).toBeNull();
  });
  it('rejects NaN concession', () => {
    expect(validateConcession(NaN, 500)).toBe('Concession is required');
  });
});

describe('computeNet', () => {
  it('subtracts concession from total', () => {
    expect(computeNet(500, 100)).toBe(400);
  });
  it('clamps at 0 when concession exceeds total', () => {
    expect(computeNet(500, 600)).toBe(0);
  });
  it('returns total when no concession', () => {
    expect(computeNet(500, 0)).toBe(500);
  });
});

describe('computeBalance', () => {
  it('subtracts received from net', () => {
    expect(computeBalance(400, 100)).toBe(300);
  });
  it('clamps at 0 when received exceeds net', () => {
    expect(computeBalance(400, 500)).toBe(0);
  });
  it('is 0 when fully paid', () => {
    expect(computeBalance(400, 400)).toBe(0);
  });
});

describe('receivedWarning', () => {
  it('warns when received exceeds net', () => {
    expect(receivedWarning(500, 400)).toBe('Received exceeds net payable');
  });
  it('no warning when received equals net', () => {
    expect(receivedWarning(400, 400)).toBeNull();
  });
  it('no warning when received less than net', () => {
    expect(receivedWarning(100, 400)).toBeNull();
  });
});
