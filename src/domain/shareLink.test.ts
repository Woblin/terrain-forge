import { describe, expect, it } from 'vitest';
import { GENERATOR_VERSION } from './generator';
import { boardLinkSearch, parseBoardLink } from './shareLink';

const link = {
  presetId: 'warhammer-40k',
  deploymentId: 'long-edges',
  seed: 123456789,
  generatorVersion: GENERATOR_VERSION,
};

describe('share links', () => {
  it('round-trips a board link', () => {
    const search = boardLinkSearch(link);
    expect(search).toBe(
      `system=warhammer-40k&deploy=long-edges&seed=021I3V9&v=${String(GENERATOR_VERSION)}`,
    );
    expect(parseBoardLink(search)).toEqual({ kind: 'valid', link, versionMismatch: false });
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
});
