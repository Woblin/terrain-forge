import { describe, expect, it } from 'vitest';
import {
  formatArea,
  formatLength,
  formatRoughArea,
  formatTableLength,
  fromInches,
  toInches,
} from './units';

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

describe('formatRoughArea', () => {
  it('rounds to the nearest ten in the unit shown', () => {
    expect(formatRoughArea(254, 'in')).toBe('250 sq in');
    expect(formatRoughArea(250, 'cm')).toBe('1,610 sq cm');
  });

  it('never rounds a shortfall down to nothing', () => {
    expect(formatRoughArea(3, 'in')).toBe('10 sq in');
  });
});

describe('formatTableLength', () => {
  it('rounds inches to the nearest half', () => {
    expect(formatTableLength(8.4, 'in')).toBe('8½″');
    expect(formatTableLength(8.2, 'in')).toBe('8″');
    expect(formatTableLength(8.8, 'in')).toBe('9″');
  });

  it('writes a lone half without a zero', () => {
    expect(formatTableLength(0.4, 'in')).toBe('½″');
    expect(formatTableLength(0.1, 'in')).toBe('0″');
  });

  it('rounds centimetres to whole ones', () => {
    expect(formatTableLength(8.5, 'cm')).toBe('22 cm');
  });

  it('never shows a length below zero', () => {
    expect(formatTableLength(-0.3, 'in')).toBe('0″');
    expect(formatTableLength(-0.3, 'cm')).toBe('0 cm');
  });
});
