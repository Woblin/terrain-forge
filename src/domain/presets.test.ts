import { describe, expect, it } from 'vitest';
import { RULE_IDS } from './fairness';
import { DEFAULT_PRESET_ID, defaultPreset, findPreset, PRESETS } from './presets';
import { TERRAIN_TYPES } from './terrain';

describe('PRESETS', () => {
  it('have unique ids', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PRESETS)('$name has an effect for every terrain type', (preset) => {
    expect(Object.keys(preset.terrainEffects).sort()).toEqual([...TERRAIN_TYPES].sort());
  });

  it.each(PRESETS)('$name has a sensible coverage range and lane limit', (preset) => {
    const { coverage, maxClearLane } = preset.balance;
    expect(coverage.min).toBeGreaterThan(0);
    expect(coverage.min).toBeLessThan(coverage.max);
    expect(coverage.max).toBeLessThan(1);
    expect(maxClearLane).toBeLessThan(preset.defaultBoard.width);
  });
});

describe('default rules', () => {
  it.each(['warhammer-fantasy', 'one-page-rules'])(
    '%s does not ask for hidden deployment',
    (id) => {
      expect(findPreset(id)?.defaultRules).toEqual(
        RULE_IDS.filter((rule) => rule !== 'hiddenDeployment'),
      );
    },
  );

  it.each(['warhammer-40k', 'age-of-sigmar'])('%s uses every rule', (id) => {
    expect(findPreset(id)?.defaultRules).toEqual(RULE_IDS);
  });
});

describe('defaultPreset', () => {
  it('is Warhammer Fantasy', () => {
    expect(DEFAULT_PRESET_ID).toBe('warhammer-fantasy');
    expect(defaultPreset().id).toBe(DEFAULT_PRESET_ID);
  });
});

describe('findPreset', () => {
  it('finds a preset by id', () => {
    expect(findPreset('warhammer-40k')?.name).toBe('Warhammer 40,000');
  });

  it('returns undefined for an unknown id', () => {
    expect(findPreset('chess')).toBeUndefined();
  });
});
