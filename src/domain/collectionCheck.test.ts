import { describe, expect, it } from 'vitest';
import { checkCollection, checkCollectionFor } from './collectionCheck';
import { RULE_IDS } from './fairness';
import { findPreset, PRESETS, type GameSystemPreset } from './presets';
import { SAMPLE_COLLECTION } from './sampleCollection';
import type { TerrainPiece } from './terrain';

function preset(id: string): GameSystemPreset {
  const found = findPreset(id);
  if (found === undefined) {
    throw new Error(`Missing preset ${id}`);
  }
  return found;
}

const forest: TerrainPiece = {
  id: 'forest',
  name: 'Forest',
  type: 'forest',
  footprint: { kind: 'ellipse', width: 9, depth: 7 },
  quantity: 2,
};

describe('checkCollection', () => {
  it('checks every game system', () => {
    expect(checkCollection(SAMPLE_COLLECTION).map((check) => check.preset.id)).toEqual(
      PRESETS.map((entry) => entry.id),
    );
  });

  it('finds nothing wrong with the sample set on a 60 x 44 board', () => {
    const check = checkCollectionFor(SAMPLE_COLLECTION, preset('warhammer-40k'));
    expect(check.level).toBe('ok');
    expect(check.findings).toEqual([]);
    expect(check.coverage).toBeCloseTo(0.39, 2);
    expect(check.coverageTarget).toEqual({ min: 0.25, max: 0.35 });
  });

  it('warns, in the generator words, when the terrain covers too little of the board', () => {
    const check = checkCollectionFor([{ ...forest, type: 'ruin' }], preset('one-page-rules'));
    expect(check.level).toBe('warning');
    expect(check.findings).toContainEqual({
      level: 'warning',
      message: 'Your terrain covers 3% of this board; 25% or more plays better.',
    });
  });

  it('calls a collection with nothing that blocks line of sight a problem', () => {
    const check = checkCollectionFor([forest], preset('warhammer-40k'));
    expect(check.level).toBe('problem');
    expect(check.findings.map((finding) => finding.message).join(' ')).toContain(
      'Nothing here blocks line of sight',
    );
  });

  it('only names what the rules that are on need sight blockers for', () => {
    const lanesOnly = checkCollectionFor(
      [forest],
      preset('warhammer-40k'),
      RULE_IDS.filter((rule) => rule !== 'hiddenDeployment'),
    );
    const messages = lanesOnly.findings.map((finding) => finding.message).join(' ');
    expect(messages).toContain('break up long firing lanes');
    expect(messages).not.toContain('hide the deployment zones');
    const fantasy = checkCollectionFor([forest], preset('warhammer-fantasy'));
    expect(fantasy.findings.map((finding) => finding.message).join(' ')).not.toContain(
      'Nothing here blocks line of sight',
    );
    const noSight = checkCollectionFor([forest], preset('warhammer-40k'), ['coverage']);
    expect(noSight.findings.map((finding) => finding.message).join(' ')).not.toContain(
      'Nothing here blocks line of sight',
    );
  });

  it('names pieces that have no matching partner', () => {
    const odd = SAMPLE_COLLECTION.map((piece) =>
      piece.id === 'building' ? { ...piece, quantity: 3 } : piece,
    );
    const check = checkCollectionFor(odd, preset('warhammer-40k'));
    expect(check.findings).toContainEqual({
      level: 'warning',
      message:
        'No matching partner for: Building. Pieces in matching pairs make fair boards easier.',
    });
  });

  it('reports pieces too large for the board and an empty library', () => {
    const huge = { ...forest, id: 'huge', name: 'Huge hill', type: 'hill' as const };
    const smallBoard = { ...preset('age-of-sigmar'), defaultBoard: { width: 10, depth: 8 } };
    const tooBig = checkCollectionFor([huge], smallBoard);
    expect(tooBig.level).toBe('problem');
    expect(tooBig.findings.map((finding) => finding.message)).toEqual([
      'None of your pieces fit on this board.',
      '"Huge hill" is too large for this board and was left out.',
      'Your terrain covers 0% of this board; 20% or more plays better.',
    ]);
    expect(checkCollectionFor([], preset('age-of-sigmar')).findings[0]).toEqual({
      level: 'problem',
      message: 'Add some terrain to generate boards.',
    });
  });
});
