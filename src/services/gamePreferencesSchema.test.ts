import { describe, expect, it } from 'vitest';
import { PREFERENCES_LIMITS, type GamePreferences } from '../domain/gamePreferences';
import { parsePreferencesDocument, preferencesDocument } from './gamePreferencesSchema';

const preferences: GamePreferences = {
  defaultPresetId: 'one-page-rules',
  rulesOff: { 'warhammer-40k': ['clearLane'], 'warhammer-fantasy': [] },
  defaultMatId: 'lava',
};

describe('game settings documents', () => {
  it('round-trip', () => {
    expect(parsePreferencesDocument(preferencesDocument(preferences))).toEqual(preferences);
  });

  it('ignore the timestamp', () => {
    const stored = { ...preferencesDocument(preferences), updatedAt: new Date() };
    expect(parsePreferencesDocument(stored)).toEqual(preferences);
  });

  it('read settings saved before mats, or with an unknown mat, as plain', () => {
    const withoutMat: Record<string, unknown> = { ...preferencesDocument(preferences) };
    delete withoutMat.defaultMatId;
    expect(parsePreferencesDocument(withoutMat)?.defaultMatId).toBe('plain');
    expect(parsePreferencesDocument({ ...withoutMat, defaultMatId: 'moon' })?.defaultMatId).toBe(
      'plain',
    );
  });

  it('accept rules off in as many games as the account may keep, and no more', () => {
    const offIn = (games: number) => ({
      ...preferencesDocument(preferences),
      rulesOff: Object.fromEntries(
        Array.from({ length: games }, (_, i) => [`game-${String(i)}`, ['clearLane']]),
      ),
    });
    const { gamesWithRulesOff } = PREFERENCES_LIMITS;
    expect(parsePreferencesDocument(offIn(gamesWithRulesOff))).not.toBeNull();
    expect(parsePreferencesDocument(offIn(gamesWithRulesOff + 1))).toBeNull();
  });

  it.each([
    ['an unknown rule', { ...preferencesDocument(preferences), rulesOff: { x: ['R9'] } }],
    ['an empty game id', { ...preferencesDocument(preferences), defaultPresetId: '' }],
    ['another schema version', { ...preferencesDocument(preferences), schemaVersion: 2 }],
    ['something that is not settings', 'warhammer-40k'],
  ])('reject %s', (_name, data) => {
    expect(parsePreferencesDocument(data)).toBeNull();
  });
});
