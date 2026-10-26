export type LengthUnit = 'in' | 'cm';

const CM_PER_INCH = 2.54;

export function toInches(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value : value / CM_PER_INCH;
}

export function fromInches(inches: number, unit: LengthUnit): number {
  return unit === 'in' ? inches : inches * CM_PER_INCH;
}
