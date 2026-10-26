import { describe, expect, it } from 'vitest';
import { formatArea, formatLength, fromInches, toInches } from './units';

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

describe('formatLength', () => {
  it('rounds to one decimal and labels the unit', () => {
    expect(formatLength(12, 'in')).toBe('12″');
    expect(formatLength(2.04, 'in')).toBe('2″');
    expect(formatLength(12.25, 'in')).toBe('12.3″');
    expect(formatLength(12, 'cm')).toBe('30.5 cm');
  });
});

describe('formatArea', () => {
  it('rounds to whole square inches or square centimetres', () => {
    expect(formatArea(141.6, 'in')).toBe('142 in²');
    expect(formatArea(10, 'cm')).toBe('65 cm²');
  });
});
