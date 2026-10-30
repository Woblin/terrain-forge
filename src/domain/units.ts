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

/**
 * A length to measure out on the table with a tape: to the nearest half inch, written `8½″`, or
 * to the nearest whole centimetre.
 */
export function formatTableLength(inches: number, unit: LengthUnit): string {
  if (unit === 'cm') {
    return `${String(Math.max(0, Math.round(fromInches(inches, 'cm'))))} cm`;
  }
  const halves = Math.max(0, Math.round(inches * 2));
  const whole = Math.floor(halves / 2);
  const half = halves % 2 === 1 ? '½' : '';
  return `${whole === 0 && half !== '' ? '' : String(whole)}${half}″`;
}

const SQUARE_CM_PER_SQUARE_INCH = CM_PER_INCH * CM_PER_INCH;

/** An area for display, for example `142 in²` or `916 cm²`, rounded to a whole number. */
export function formatArea(squareInches: number, unit: LengthUnit): string {
  return unit === 'in'
    ? `${String(Math.round(squareInches))} in²`
    : `${String(Math.round(squareInches * SQUARE_CM_PER_SQUARE_INCH))} cm²`;
}

/** A rough area for advice, for example `250 sq in` or `1,610 sq cm`, to the nearest ten. */
export function formatRoughArea(squareInches: number, unit: LengthUnit): string {
  const value = unit === 'in' ? squareInches : squareInches * SQUARE_CM_PER_SQUARE_INCH;
  const rounded = Math.max(10, Math.round(value / 10) * 10);
  return `${rounded.toLocaleString('en')} sq ${unit}`;
}
