import { INITIAL_GAME_PREFERENCES, type GamePreferences } from '../domain/gamePreferences';
import type { LengthUnit } from '../domain/units';
import { parsePreferencesDocument, preferencesDocument } from './gamePreferencesSchema';

const UNIT_KEY = 'terrain-forge.length-unit';
const GAME_KEY = 'terrain-forge.game-preferences';

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

/**
 * The game and balance rules the player picked last time on this device. Like the unit, these
 * are a convenience: when storage fails or holds something unreadable, the defaults are used.
 */
export function loadGamePreferences(): GamePreferences {
  try {
    const stored = localStorage.getItem(GAME_KEY);
    return (
      (stored === null ? null : parsePreferencesDocument(JSON.parse(stored))) ??
      INITIAL_GAME_PREFERENCES
    );
  } catch (error) {
    console.warn('Could not read the saved game settings; using the defaults.', error);
    return INITIAL_GAME_PREFERENCES;
  }
}

export function saveGamePreferences(preferences: GamePreferences): void {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(preferencesDocument(preferences)));
  } catch (error) {
    console.warn('Could not save the game settings; they reset on the next visit.', error);
  }
}
