import { describe, expect, it, vi } from 'vitest';
import type { LibraryPiece } from '../domain/library';
import type { LibrarySnapshot } from './libraryStore';
import { createMemoryLibrary } from './memoryLibrary';

const ruin: LibraryPiece = {
  id: 'ruin',
  name: 'Ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 6, depth: 4 },
  quantity: 2,
  image: null,
};

function listen() {
  const store = createMemoryLibrary();
  const seen: LibrarySnapshot[] = [];
  const stop = store.subscribe((snapshot) => seen.push(snapshot), vi.fn());
  return { store, seen, stop };
}

describe('createMemoryLibrary', () => {
  it('reports the library at once and after every change', async () => {
    const { store, seen } = listen();
    await store.add([ruin]);
    await store.update({ ...ruin, quantity: 5 });
    await store.remove('ruin');
    expect(seen.map((snapshot) => snapshot.pieces.map((piece) => piece.quantity))).toEqual([
      [],
      [2],
      [5],
      [],
    ]);
  });

  it('refuses to add a piece twice or update one that is gone', async () => {
    const { store } = listen();
    await store.add([ruin]);
    await expect(store.add([ruin])).rejects.toThrow('"Ruin" is already in your library.');
    await store.remove('ruin');
    await expect(store.update(ruin)).rejects.toThrow('"Ruin" is no longer in your library.');
  });

  it('stops telling a listener once it unsubscribes, and is not persistent', async () => {
    const { store, seen, stop } = listen();
    stop();
    await store.add([ruin]);
    expect(seen).toHaveLength(1);
    expect(store.persistent).toBe(false);
    expect(store.newId()).not.toBe(store.newId());
  });
});
