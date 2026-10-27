import { describe, expect, it } from 'vitest';
import { RULE_IDS, type RuleId } from './fairness';
import { GENERATOR_VERSION } from './generator';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { boardLinkSearch, parseBoardLink } from './shareLink';

const link = {
  presetId: 'warhammer-40k',
  deploymentId: 'long-edges',
  seed: 123456789,
  generatorVersion: GENERATOR_VERSION,
  pieces: null,
  enabledRules: null,
};

describe('share links', () => {
  it('round-trips a board link', () => {
    const search = boardLinkSearch(link);
    expect(search).toBe(
      `system=warhammer-40k&deploy=long-edges&seed=021I3V9&v=${String(GENERATOR_VERSION)}`,
    );
    expect(parseBoardLink(search)).toEqual({ kind: 'valid', link, versionMismatch: false });
  });

  it('carries the rules that are off', () => {
    const enabledRules: RuleId[] = ['coverInReach', 'nearestCover', 'coverage'];
    const withRules = { ...link, enabledRules };
    const search = boardLinkSearch(withRules);
    expect(search).toContain('&off=R1%2CR4%2CR5');
    expect(parseBoardLink(search)).toEqual({
      kind: 'valid',
      link: withRules,
      versionMismatch: false,
    });
  });

  it('writes an empty list when every rule is on', () => {
    const allOn = { ...link, enabledRules: RULE_IDS };
    const search = boardLinkSearch(allOn);
    expect(search).toContain('&off=');
    expect(parseBoardLink(search)).toMatchObject({ link: { enabledRules: RULE_IDS } });
  });

  it('rejects an unknown rule', () => {
    expect(parseBoardLink('system=warhammer-40k&deploy=long-edges&seed=1&off=R9')).toEqual({
      kind: 'invalid',
      reason: 'This board link names a balance rule Terrain Forge does not know.',
    });
  });

  it('accepts a leading question mark and a missing version', () => {
    expect(parseBoardLink('?system=warhammer-40k&deploy=long-edges&seed=21i3v9')).toMatchObject({
      kind: 'valid',
      link: { seed: 123456789 },
    });
  });

  it('is empty without board parameters', () => {
    expect(parseBoardLink('')).toEqual({ kind: 'empty' });
    expect(parseBoardLink('?utm=x')).toEqual({ kind: 'empty' });
  });

  it('rejects incomplete, unknown or malformed links', () => {
    expect(parseBoardLink('system=warhammer-40k')).toMatchObject({ kind: 'invalid' });
    expect(parseBoardLink('system=chess&deploy=long-edges&seed=1')).toMatchObject({
      kind: 'invalid',
    });
    expect(parseBoardLink('system=warhammer-40k&deploy=diagonal&seed=1')).toMatchObject({
      kind: 'invalid',
    });
    expect(parseBoardLink('system=warhammer-40k&deploy=long-edges&seed=!!')).toEqual({
      kind: 'invalid',
      reason: '"!!" is not a valid board code.',
    });
    expect(parseBoardLink('system=warhammer-40k&deploy=long-edges&seed=1&v=x')).toMatchObject({
      kind: 'invalid',
    });
  });

  it('flags links made by another generator version', () => {
    expect(
      parseBoardLink(boardLinkSearch({ ...link, generatorVersion: GENERATOR_VERSION + 1 })),
    ).toMatchObject({ kind: 'valid', versionMismatch: true });
  });

  it('carries a personal collection, and treats a link without one as the sample set', () => {
    const search = boardLinkSearch({ ...link, pieces: SAMPLE_COLLECTION });
    expect(search).toContain('&pieces=or6x1x4_br10x10x2_ce5x5x2_fe9x7x2_rr12x6x6_rr8x5x6');
    const parsed = parseBoardLink(search);
    expect(parsed.kind === 'valid' && parsed.link.pieces?.length).toBe(SAMPLE_COLLECTION.length);
    expect(parseBoardLink(boardLinkSearch(link))).toMatchObject({ link: { pieces: null } });
  });

  it('rejects a collection it cannot read', () => {
    expect(parseBoardLink('system=warhammer-40k&deploy=long-edges&seed=1&pieces=zz1x1x1')).toEqual({
      kind: 'invalid',
      reason: 'The terrain in this board link could not be read.',
    });
  });
});
