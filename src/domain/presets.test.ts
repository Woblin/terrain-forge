import { describe, expect, it } from 'vitest';
import { findPreset, PRESETS } from './presets';
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

describe('findPreset', () => {
  it('finds a preset by id', () => {
    expect(findPreset('warhammer-40k')?.name).toBe('Warhammer 40,000');
  });

  it('returns undefined for an unknown id', () => {
    expect(findPreset('chess')).toBeUndefined();
  });
});
