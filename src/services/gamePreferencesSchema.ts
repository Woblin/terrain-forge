import { z } from 'zod';
import { RULE_IDS } from '../domain/fairness';
import { PREFERENCES_LIMITS, type GamePreferences } from '../domain/gamePreferences';
import { matIdOf } from '../domain/mats';
import { STORED_ID_LENGTH } from '../domain/storageLimits';
import { NEWER_VERSION_PROBLEM, schemaFor } from './schemaVersion';

/** Bump when the shape of the saved settings changes, and teach the reader the old shape. */
export const PREFERENCES_SCHEMA_VERSION = 1;

const gameId = z.string().min(1).max(STORED_ID_LENGTH);

/**
 * The settings as they are stored, in this browser and in `users/{uid}/settings/preferences`.
 * Timestamps are not read.
 */
const preferencesDocumentSchema = z.object({
  defaultPresetId: gameId,
  rulesOff: z
    .record(gameId, z.array(z.enum(RULE_IDS)).max(RULE_IDS.length))
    .refine((off) => Object.keys(off).length <= PREFERENCES_LIMITS.gamesWithRulesOff, {
      message: `Rules can be off in at most ${String(PREFERENCES_LIMITS.gamesWithRulesOff)} games.`,
    }),
  /** Missing on settings saved before mats; a mat this version does not know reads as plain. */
  defaultMatId: gameId.optional(),
  schemaVersion: z.literal(PREFERENCES_SCHEMA_VERSION),
});

export type PreferencesDocument = z.infer<typeof preferencesDocumentSchema>;

/** The schema for each version the settings have been saved with. */
const readers = { [PREFERENCES_SCHEMA_VERSION]: preferencesDocumentSchema };

/** Checks stored settings before they reach the app; null when they cannot be read. */
export function parsePreferencesDocument(data: unknown): GamePreferences | null {
  const reader = schemaFor(data, readers, PREFERENCES_SCHEMA_VERSION);
  if (reader.newer) {
    console.warn(`Saved game settings ${NEWER_VERSION_PROBLEM}`);
    return null;
  }
  const result = reader.schema.safeParse(data);
  if (!result.success) {
    console.warn('Saved game settings could not be read.', result.error.issues);
    return null;
  }
  const { defaultPresetId, rulesOff, defaultMatId } = result.data;
  return { defaultPresetId, rulesOff, defaultMatId: matIdOf(defaultMatId) };
}

/** The fields written for the settings, without the timestamp. */
export function preferencesDocument(preferences: GamePreferences): PreferencesDocument {
  return {
    defaultPresetId: preferences.defaultPresetId,
    rulesOff: Object.fromEntries(
      Object.entries(preferences.rulesOff).map(([presetId, off]) => [presetId, [...off]]),
    ),
    defaultMatId: preferences.defaultMatId,
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
  };
}
