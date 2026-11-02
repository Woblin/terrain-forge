import { describe, expect, it } from 'vitest';
import {
  boardLinkFor,
  linkPieces,
  linksToOwn,
  OWN_SOURCE,
  sameSource,
  sourceKind,
  type CollectionSource,
} from './boardSource';
import type { LayoutOrigin } from './editor';
import { GENERATOR_VERSION } from './generator';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { boardLinkSearch } from './shareLink';
import type { TerrainPiece } from './terrain';

const ownPieces: readonly TerrainPiece[] = SAMPLE_COLLECTION.slice(0, 3);
const otherPieces: readonly TerrainPiece[] = SAMPLE_COLLECTION.slice(3);

function linkTo(pieces: readonly TerrainPiece[]): CollectionSource {
  return { kind: 'link', pieces };
}

const origin: LayoutOrigin = {
  board: { width: 72, depth: 48 },
  seed: 2024,
  presetId: 'warhammer-fantasy',
  deploymentId: 'long-edges',
  generatorVersion: GENERATOR_VERSION,
  enabledRules: ['coverInReach', 'nearestCover'],
};

describe('linkPieces', () => {
  it('leaves the sample set out of the link', () => {
    expect(linkPieces(OWN_SOURCE, SAMPLE_COLLECTION)).toBeNull();
    expect(linkPieces(linkTo(SAMPLE_COLLECTION), ownPieces)).toBeNull();
  });

  it('carries the player’s own terrain, or the terrain kept with the board', () => {
    expect(linkPieces(OWN_SOURCE, ownPieces)).toBe(ownPieces);
    expect(linkPieces({ kind: 'saved', pieces: otherPieces }, ownPieces)).toBe(otherPieces);
  });
});

describe('sameSource', () => {
  it('counts two own sources as the same terrain', () => {
    expect(sameSource(OWN_SOURCE, { kind: 'own' })).toBe(true);
  });

  it('tells apart two links, even with the same pieces', () => {
    const link = linkTo(otherPieces);
    expect(sameSource(link, link)).toBe(true);
    expect(sameSource(link, linkTo(otherPieces))).toBe(false);
    expect(sameSource(link, OWN_SOURCE)).toBe(false);
  });
});

describe('linksToOwn', () => {
  it('finds a link to the player’s own terrain', () => {
    expect(linksToOwn(linkTo([...ownPieces]), ownPieces)).toBe(true);
    expect(linksToOwn(linkTo(otherPieces), ownPieces)).toBe(false);
  });

  it('only looks at links', () => {
    expect(linksToOwn({ kind: 'saved', pieces: ownPieces }, ownPieces)).toBe(false);
    expect(linksToOwn(OWN_SOURCE, ownPieces)).toBe(false);
  });
});

describe('sourceKind', () => {
  it('names each source', () => {
    expect(sourceKind(OWN_SOURCE, ownPieces)).toBe('library');
    expect(sourceKind(OWN_SOURCE, SAMPLE_COLLECTION)).toBe('sample');
    expect(sourceKind(linkTo(otherPieces), otherPieces)).toBe('link');
    expect(sourceKind({ kind: 'saved', pieces: otherPieces }, otherPieces)).toBe('saved');
  });
});

describe('boardLinkFor', () => {
  it('is the share link with the pieces the source gives', () => {
    expect(boardLinkFor(origin, OWN_SOURCE, ownPieces, 'lava')).toBe(
      boardLinkSearch({ ...origin, pieces: ownPieces, matId: 'lava' }),
    );
    expect(boardLinkFor(origin, OWN_SOURCE, SAMPLE_COLLECTION, 'plain')).toBe(
      boardLinkSearch({ ...origin, pieces: null, matId: 'plain' }),
    );
    expect(boardLinkFor(origin, linkTo(otherPieces), ownPieces, 'plain')).toContain('pieces=');
  });
});
