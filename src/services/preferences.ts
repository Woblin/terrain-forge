import { z } from 'zod';
import { matDarknessOf, MAT_DARKNESS_RANGE } from '../domain/mats';
import { INITIAL_GAME_PREFERENCES, type GamePreferences } from '../domain/gamePreferences';
import { parseThemeChoice, type ThemeChoice } from '../domain/theme';
import type { LengthUnit } from '../domain/units';
import { parsePreferencesDocument, preferencesDocument } from './gamePreferencesSchema';

const UNIT_KEY = 'terrain-forge.length-unit';
const GAME_KEY = 'terrain-forge.game-preferences';
/** Also read by the script in index.html that sets the theme before the page draws. */
export const THEME_KEY = 'terrain-forge.theme';

/**
 * What is stored under `key` on this device, read with `parse`. Storage can be switched off or
 * full, and these settings are only a convenience, so a failure gives `fallback` and is logged.
 */
function readLocal<T>(
  key: string,
  parse: (stored: string | null) => T,
  fallback: T,
  failure: string,
): T {
  try {
    return parse(localStorage.getItem(key));
  } catch (error) {
    console.warn(failure, error);
    return fallback;
  }
}

/** Stores `value` under `key` on this device; a failure is logged, since it only costs a convenience. */
function writeLocal(key: string, value: string, failure: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(failure, error);
  }
}

/** The unit the player picked last time on this device. */
export function loadLengthUnit(): LengthUnit {
  return readLocal(
    UNIT_KEY,
    (stored) => (stored === 'cm' ? 'cm' : 'in'),
    'in',
    'Could not read the saved length unit; using inches.',
  );
}

export function saveLengthUnit(unit: LengthUnit): void {
  writeLocal(UNIT_KEY, unit, 'Could not save the length unit; it resets on the next visit.');
}

/** The game and balance rules the player picked last time on this device; unreadable gives the defaults. */
export function loadGamePreferences(): GamePreferences {
  return readLocal(
    GAME_KEY,
    (stored) =>
      (stored === null ? null : parsePreferencesDocument(JSON.parse(stored))) ??
      INITIAL_GAME_PREFERENCES,
    INITIAL_GAME_PREFERENCES,
    'Could not read the saved game settings; using the defaults.',
  );
}

export function saveGamePreferences(preferences: GamePreferences): void {
  writeLocal(
    GAME_KEY,
    JSON.stringify(preferencesDocument(preferences)),
    'Could not save the game settings; they reset on the next visit.',
  );
}

/** The theme the player picked on this device. */
export function loadThemeChoice(): ThemeChoice {
  return readLocal(
    THEME_KEY,
    parseThemeChoice,
    'system',
    'Could not read the saved theme; following the device.',
  );
}

export function saveThemeChoice(choice: ThemeChoice): void {
  writeLocal(THEME_KEY, choice, 'Could not save the theme; it resets on the next visit.');
}

const MAT_DARKNESS_KEY = 'terrain-forge.mat-darkness';

/** How dark the player wants the mats on this device. */
export function loadMatDarkness(): number {
  return readLocal(
    MAT_DARKNESS_KEY,
    (stored) => (stored === null ? MAT_DARKNESS_RANGE.standard : matDarknessOf(Number(stored))),
    MAT_DARKNESS_RANGE.standard,
    'Could not read the saved mat darkness; using the standard.',
  );
}

export function saveMatDarkness(darkness: number): void {
  writeLocal(
    MAT_DARKNESS_KEY,
    String(darkness),
    'Could not save the mat darkness; it resets on the next visit.',
  );
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
  return readLocal(
    PANELS_KEY,
    (stored) => (stored === null ? ALL_PANELS_OPEN : parseOpenPanels(JSON.parse(stored))),
    ALL_PANELS_OPEN,
    'Could not read which board panels were open; opening both.',
  );
}

export function saveOpenPanels(panels: OpenPanels): void {
  writeLocal(
    PANELS_KEY,
    JSON.stringify(panels),
    'Could not save which board panels are open; they reset on the next visit.',
  );
}

const openPanelsSchema = z
  .object({ setup: z.boolean().catch(true), details: z.boolean().catch(true) })
  .catch(ALL_PANELS_OPEN);

/** Stored panels, with any panel that cannot be read open. Exported for the test. */
export function parseOpenPanels(value: unknown): OpenPanels {
  return openPanelsSchema.parse(value);
}

const BOARD_TIP_KEY = 'terrain-forge.board-tip-dismissed';

/** Whether the player has put away the editing tip under the board on this device. */
export function loadBoardTipDismissed(): boolean {
  return readLocal(
    BOARD_TIP_KEY,
    (stored) => stored === 'true',
    false,
    'Could not read whether the board tip was dismissed; showing it.',
  );
}

export function saveBoardTipDismissed(): void {
  writeLocal(
    BOARD_TIP_KEY,
    'true',
    'Could not save that the board tip was dismissed; it shows again next visit.',
  );
}
