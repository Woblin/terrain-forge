import { describe, expect, it } from 'vitest';
import { fromInches, toInches } from './units';

describe('toInches', () => {
  it('keeps inches unchanged', () => {
    expect(toInches(44, 'in')).toBe(44);
  });

  it('converts centimeters to inches', () => {
    expect(toInches(2.54, 'cm')).toBeCloseTo(1);
  });
});

describe('fromInches', () => {
  it('keeps inches unchanged', () => {
    expect(fromInches(60, 'in')).toBe(60);
  });

  it('converts inches to centimeters', () => {
    expect(fromInches(60, 'cm')).toBeCloseTo(152.4);
  });

  it('round-trips through centimeters', () => {
    expect(toInches(fromInches(44, 'cm'), 'cm')).toBeCloseTo(44);
  });
});
