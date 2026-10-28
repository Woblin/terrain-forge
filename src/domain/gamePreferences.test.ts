import { describe, expect, it } from 'vitest';
import { RULE_IDS } from './fairness';
import {
  enabledRulesFor,
  INITIAL_GAME_PREFERENCES,
  startingPreset,
  withDefaultPreset,
  usesDefaultRules,
  withRuleSwitched,
  withRulesReset,
} from './gamePreferences';
import { findPreset, type GameSystemPreset } from './presets';

function preset(id: string): GameSystemPreset {
  const found = findPreset(id);
  if (found === undefined) {
    throw new Error(`Missing preset ${id}`);
  }
  return found;
}

const fantasy = preset('warhammer-fantasy');
const warhammer40k = preset('warhammer-40k');

describe('startingPreset', () => {
  it('starts a new player on Warhammer Fantasy', () => {
    expect(startingPreset(INITIAL_GAME_PREFERENCES).id).toBe('warhammer-fantasy');
  });

  it('starts on the last game picked', () => {
    const picked = withDefaultPreset(INITIAL_GAME_PREFERENCES, 'one-page-rules');
    expect(startingPreset(picked).id).toBe('one-page-rules');
  });

  it('falls back to Warhammer Fantasy for a game that no longer exists', () => {
    const gone = withDefaultPreset(INITIAL_GAME_PREFERENCES, 'chess');
    expect(startingPreset(gone).id).toBe('warhammer-fantasy');
  });
});

describe('enabledRulesFor', () => {
  it("uses the game's defaults until the player switches a rule", () => {
    expect(enabledRulesFor(fantasy, INITIAL_GAME_PREFERENCES)).toEqual(fantasy.defaultRules);
    expect(enabledRulesFor(warhammer40k, INITIAL_GAME_PREFERENCES)).toEqual(RULE_IDS);
  });
});

describe('withRuleSwitched', () => {
  it('switches a rule off for one game only', () => {
    const next = withRuleSwitched(INITIAL_GAME_PREFERENCES, warhammer40k, 'clearLane', false);
    expect(enabledRulesFor(warhammer40k, next)).toEqual(
      RULE_IDS.filter((rule) => rule !== 'clearLane'),
    );
    expect(enabledRulesFor(fantasy, next)).toEqual(fantasy.defaultRules);
  });

  it('switches a rule that is off by default on', () => {
    const next = withRuleSwitched(INITIAL_GAME_PREFERENCES, fantasy, 'hiddenDeployment', true);
    expect(enabledRulesFor(fantasy, next)).toEqual(RULE_IDS.filter((rule) => rule !== 'clearLane'));
    expect(next.rulesOff[fantasy.id]).toEqual(['clearLane']);
  });

  it('keeps the other rules of that game as they were', () => {
    const once = withRuleSwitched(INITIAL_GAME_PREFERENCES, fantasy, 'coverage', false);
    const twice = withRuleSwitched(once, fantasy, 'coverage', true);
    expect(enabledRulesFor(fantasy, twice)).toEqual(fantasy.defaultRules);
    expect(twice.rulesOff[fantasy.id]).toEqual(['hiddenDeployment', 'clearLane']);
  });
});

describe('withRulesReset', () => {
  it("forgets one game's switches and keeps the others", () => {
    const switched = withRuleSwitched(
      withRuleSwitched(INITIAL_GAME_PREFERENCES, fantasy, 'clearLane', true),
      warhammer40k,
      'coverage',
      false,
    );
    const reset = withRulesReset(switched, fantasy);
    expect(enabledRulesFor(fantasy, reset)).toEqual(fantasy.defaultRules);
    expect(reset.rulesOff[fantasy.id]).toBeUndefined();
    expect(reset.rulesOff[warhammer40k.id]).toEqual(['coverage']);
  });
});

describe('usesDefaultRules', () => {
  it('is true until a rule is switched, and again once it is switched back', () => {
    expect(usesDefaultRules(fantasy, INITIAL_GAME_PREFERENCES)).toBe(true);
    const once = withRuleSwitched(INITIAL_GAME_PREFERENCES, fantasy, 'clearLane', true);
    expect(usesDefaultRules(fantasy, once)).toBe(false);
    expect(usesDefaultRules(fantasy, withRuleSwitched(once, fantasy, 'clearLane', false))).toBe(
      true,
    );
  });
});
