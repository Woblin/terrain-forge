import { inRuleOrder, RULE_IDS, type RuleId } from './fairness';
import { DEFAULT_PRESET_ID, defaultPreset, findPreset, type GameSystemPreset } from './presets';

/** The game a player starts on, and the balance rules they switched for each game. */
export interface GamePreferences {
  readonly defaultPresetId: string;
  /**
   * Every rule that is off, by game id. A game the player never switched a rule for is missing,
   * and uses its preset's defaults.
   */
  readonly rulesOff: Readonly<Record<string, readonly RuleId[]>>;
}

export const INITIAL_GAME_PREFERENCES: GamePreferences = {
  defaultPresetId: DEFAULT_PRESET_ID,
  rulesOff: {},
};

/** The game a new board starts on. A game that no longer exists falls back to the default. */
export function startingPreset(preferences: GamePreferences): GameSystemPreset {
  return findPreset(preferences.defaultPresetId) ?? defaultPreset();
}

/** The rules that are on for a game, in R1 to R6 order. */
export function enabledRulesFor(preset: GameSystemPreset, preferences: GamePreferences): RuleId[] {
  const off = preferences.rulesOff[preset.id];
  return off === undefined
    ? inRuleOrder(preset.defaultRules)
    : RULE_IDS.filter((rule) => !off.includes(rule));
}

export function withDefaultPreset(preferences: GamePreferences, presetId: string): GamePreferences {
  return { ...preferences, defaultPresetId: presetId };
}

/** Switches one rule on or off for a game, keeping that game's other rules as they are. */
export function withRuleSwitched(
  preferences: GamePreferences,
  preset: GameSystemPreset,
  rule: RuleId,
  enabled: boolean,
): GamePreferences {
  const on = enabledRulesFor(preset, preferences);
  const next = enabled ? inRuleOrder([...on, rule]) : on.filter((other) => other !== rule);
  const off = RULE_IDS.filter((other) => !next.includes(other));
  return { ...preferences, rulesOff: { ...preferences.rulesOff, [preset.id]: off } };
}
