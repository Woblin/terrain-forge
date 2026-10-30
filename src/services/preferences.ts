import { matDarknessOf, MAT_DARKNESS_RANGE } from '../domain/mats';
import { INITIAL_GAME_PREFERENCES, type GamePreferences } from '../domain/gamePreferences';
import { parseThemeChoice, type ThemeChoice } from '../domain/theme';
import type { LengthUnit } from '../domain/units';
import { parsePreferencesDocument, preferencesDocument } from './gamePreferencesSchema';

const UNIT_KEY = 'terrain-forge.length-unit';
const GAME_KEY = 'terrain-forge.game-preferences';
/** Also read by the script in index.html that sets the theme before the page draws. */
const THEME_KEY = 'terrain-forge.theme';

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

/** The theme the player picked on this device. Like the unit, a failure falls back to the default. */
export function loadThemeChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_KEY));
  } catch (error) {
    console.warn('Could not read the saved theme; following the device.', error);
    return 'system';
  }
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch (error) {
    console.warn('Could not save the theme; it resets on the next visit.', error);
  }
}

const MAT_DARKNESS_KEY = 'terrain-forge.mat-darkness';

/** How dark the player wants the mats on this device. Like the unit, a failure uses the default. */
export function loadMatDarkness(): number {
  try {
    const stored = localStorage.getItem(MAT_DARKNESS_KEY);
    return stored === null ? MAT_DARKNESS_RANGE.standard : matDarknessOf(Number(stored));
  } catch (error) {
    console.warn('Could not read the saved mat darkness; using the standard.', error);
    return MAT_DARKNESS_RANGE.standard;
  }
}

export function saveMatDarkness(darkness: number): void {
  try {
    localStorage.setItem(MAT_DARKNESS_KEY, String(darkness));
  } catch (error) {
    console.warn('Could not save the mat darkness; it resets on the next visit.', error);
  }
}

const PANELS_KEY = 'terrain-forge.board-panels';

/** Which side panels are open next to the board on a wide screen. */
export interface OpenPanels {
  readonly setup: boolean;
  readonly details: boolean;
}

const ALL_PANELS_OPEN: OpenPanels = { setup: true, details: true };

/** The side panels as the player left them on this device; both open when unknown. */
export function loadOpenPanels(): OpenPanels {
  try {
    const stored = localStorage.getItem(PANELS_KEY);
    return stored === null ? ALL_PANELS_OPEN : parseOpenPanels(JSON.parse(stored));
  } catch (error) {
    console.warn('Could not read which board panels were open; opening both.', error);
    return ALL_PANELS_OPEN;
  }
}

export function saveOpenPanels(panels: OpenPanels): void {
  try {
    localStorage.setItem(PANELS_KEY, JSON.stringify(panels));
  } catch (error) {
    console.warn(
      'Could not save which board panels are open; they reset on the next visit.',
      error,
    );
  }
}

function parseOpenPanels(value: unknown): OpenPanels {
  if (typeof value !== 'object' || value === null) {
    return ALL_PANELS_OPEN;
  }
  const setup = 'setup' in value ? value.setup : undefined;
  const details = 'details' in value ? value.details : undefined;
  return {
    setup: typeof setup === 'boolean' ? setup : true,
    details: typeof details === 'boolean' ? details : true,
  };
}

const BOARD_TIP_KEY = 'terrain-forge.board-tip-dismissed';

/** Whether the player has put away the editing tip under the board on this device. */
export function loadBoardTipDismissed(): boolean {
  try {
    return localStorage.getItem(BOARD_TIP_KEY) === 'true';
  } catch (error) {
    console.warn('Could not read whether the board tip was dismissed; showing it.', error);
    return false;
  }
}

export function saveBoardTipDismissed(): void {
  try {
    localStorage.setItem(BOARD_TIP_KEY, 'true');
  } catch (error) {
    console.warn(
      'Could not save that the board tip was dismissed; it shows again next visit.',
      error,
    );
  }
}
