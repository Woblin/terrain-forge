import { describe, expect, it } from 'vitest';
import { boardEntry, type KeptBoard } from './boardEntry';
import { boardLinkFor, linksToOwn, OWN_SOURCE } from './boardSource';
import type { LayoutOrigin } from './editor';
import type { RuleId } from './fairness';
import { GENERATOR_VERSION } from './generator';
import { findPreset } from './presets';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { boardLinkSearch } from './shareLink';
import type { TerrainPiece } from './terrain';

const own: readonly TerrainPiece[] = SAMPLE_COLLECTION.slice(0, 3);
const shared: readonly TerrainPiece[] = SAMPLE_COLLECTION.slice(3);
const sharedRules: readonly RuleId[] = ['coverInReach', 'nearestCover'];

const origin: LayoutOrigin = {
  board: { width: 72, depth: 48 },
  seed: 2024,
  presetId: 'warhammer-fantasy',
  deploymentId: 'long-edges',
  generatorVersion: GENERATOR_VERSION,
  enabledRules: sharedRules,
};

const NO_BOARD: KeptBoard = { origin: null, openedId: null, source: OWN_SOURCE, mat: 'plain' };
const KEPT: KeptBoard = { origin, openedId: null, source: OWN_SOURCE, mat: 'plain' };
const KEPT_SAVED: KeptBoard = { ...KEPT, openedId: 'board-1' };

const sharedLink = boardLinkSearch({
  presetId: 'warhammer-40k',
  deploymentId: 'short-edges',
  seed: 77,
  generatorVersion: GENERATOR_VERSION,
  pieces: shared,
  enabledRules: sharedRules,
  matId: 'plain',
});

describe('boardEntry for a saved board', () => {
  it('keeps the saved board that is already open', () => {
    expect(boardEntry(KEPT_SAVED, own, 'saved=board-1', null)).toEqual({ kind: 'keep' });
  });

  it('opens the saved board the address names when another board is open', () => {
    expect(boardEntry(KEPT_SAVED, own, 'saved=board-2', null)).toEqual({
      kind: 'saved',
      id: 'board-2',
    });
    expect(boardEntry(NO_BOARD, own, 'saved=board-1', null)).toEqual({
      kind: 'saved',
      id: 'board-1',
    });
  });
});

describe('boardEntry for the board kept from before', () => {
  it('keeps it when the address is empty', () => {
    expect(boardEntry(KEPT, own, '', null)).toEqual({ kind: 'keep' });
  });

  it('keeps it when the address is its own link', () => {
    expect(boardEntry(KEPT, own, boardLinkFor(origin, OWN_SOURCE, own, 'plain'), null)).toEqual({
      kind: 'keep',
    });
  });

  it('starts a new board when another page asks for one', () => {
    expect(boardEntry(KEPT, own, '', { newBoard: true })).toMatchObject({ kind: 'new' });
  });
});

describe('boardEntry for a shared link', () => {
  it('makes the linked board on the link’s terrain and rules', () => {
    const entry = boardEntry(KEPT, own, sharedLink, null);
    expect(entry).toMatchObject({
      kind: 'new',
      link: { kind: 'valid' },
      choice: { presetId: 'warhammer-40k', deploymentId: 'short-edges' },
      source: { kind: 'link' },
      enabledRules: sharedRules,
      picked: false,
    });
    expect(entry.kind === 'new' && linksToOwn(entry.source, shared)).toBe(true);
  });

  it('uses the sample set for a link without pieces', () => {
    const search = boardLinkSearch({
      presetId: 'warhammer-40k',
      deploymentId: 'short-edges',
      seed: 77,
      generatorVersion: GENERATOR_VERSION,
      pieces: null,
      enabledRules: sharedRules,
      matId: 'plain',
    });
    expect(boardEntry(NO_BOARD, own, search, null)).toMatchObject({
      source: { kind: 'link', pieces: SAMPLE_COLLECTION },
    });
  });

  it('uses the game’s default rules for a link made before rules were in links', () => {
    const search = 'system=warhammer-fantasy&deploy=long-edges&seed=1&v=1';
    expect(boardEntry(NO_BOARD, own, search, null)).toMatchObject({
      kind: 'new',
      enabledRules: findPreset('warhammer-fantasy')?.defaultRules,
    });
  });

  it('makes a new board on the player’s terrain for a broken link, with the reason', () => {
    const entry = boardEntry(KEPT, own, 'system=nowhere&deploy=long-edges&seed=1', null);
    expect(entry).toMatchObject({
      kind: 'new',
      link: { kind: 'invalid' },
      choice: null,
      source: OWN_SOURCE,
      enabledRules: null,
      picked: false,
    });
  });
});

describe('boardEntry for a board another page asked for', () => {
  it('starts on the game the player picked, which becomes their default', () => {
    expect(boardEntry(KEPT, own, '', { presetId: 'age-of-sigmar' })).toMatchObject({
      kind: 'new',
      choice: { presetId: 'age-of-sigmar', deploymentId: 'long-edges' },
      source: OWN_SOURCE,
      picked: true,
    });
  });

  it('starts on the player’s own game for an unknown game or a plain new board', () => {
    for (const state of [{ presetId: 'chess' }, { newBoard: true }]) {
      expect(boardEntry(NO_BOARD, own, '', state)).toMatchObject({
        kind: 'new',
        choice: null,
        picked: false,
      });
    }
  });

  it('ignores a saved board in the address when a new board is asked for', () => {
    expect(boardEntry(KEPT_SAVED, own, 'saved=board-1', { newBoard: true })).toMatchObject({
      kind: 'new',
    });
  });
});

describe('boardEntry with no board yet', () => {
  it('makes a new board on the player’s terrain', () => {
    expect(boardEntry(NO_BOARD, own, '', null)).toEqual({
      kind: 'new',
      link: { kind: 'empty' },
      choice: null,
      source: OWN_SOURCE,
      enabledRules: null,
      picked: false,
    });
  });

  it('ignores route state that is not a request', () => {
    expect(boardEntry(NO_BOARD, own, '', { from: 'home' })).toMatchObject({ choice: null });
    expect(boardEntry(KEPT, own, '', 'newBoard')).toEqual({ kind: 'keep' });
  });
});
