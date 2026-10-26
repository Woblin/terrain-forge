import type { LengthUnit } from '../domain/units';

const UNIT_KEY = 'terrain-forge.length-unit';

/**
 * The unit the player picked last time on this device. Storage can be switched off or full;
 * the unit is only a convenience, so the default is used and the problem is logged.
 */
export function loadLengthUnit(): LengthUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === 'cm' ? 'cm' : 'in';
  } catch (error) {
    console.warn('Could not read the saved length unit; using inches.', error);
    return 'in';
  }
}

export function saveLengthUnit(unit: LengthUnit): void {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch (error) {
    console.warn('Could not save the length unit; it resets on the next visit.', error);
  }
}
