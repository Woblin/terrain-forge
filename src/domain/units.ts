export type LengthUnit = 'in' | 'cm';

const CM_PER_INCH = 2.54;

export function toInches(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value : value / CM_PER_INCH;
}

export function fromInches(inches: number, unit: LengthUnit): number {
  return unit === 'in' ? inches : inches * CM_PER_INCH;
}

/** A length for display, for example `12.5″` or `31.8 cm`, rounded to one decimal. */
export function formatLength(inches: number, unit: LengthUnit): string {
  const value = String(Number(fromInches(inches, unit).toFixed(1)));
  return unit === 'in' ? `${value}″` : `${value} cm`;
}
