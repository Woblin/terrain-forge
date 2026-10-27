import { describe, expect, it, vi } from 'vitest';
import type { LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
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

const photo: EncodedPhoto = {
  blob: new Blob(['photo'], { type: 'image/webp' }),
  width: 384,
  height: 256,
  mimeType: 'image/webp',
};

function listen() {
  const store = createMemoryLibrary();
  const seen: LibrarySnapshot[] = [];
  const stop = store.subscribe({
    onChange: (snapshot) => seen.push(snapshot),
    onError: vi.fn(),
    onWriteFailed: vi.fn(),
  });
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
    expect(seen.every((snapshot) => !snapshot.saving)).toBe(true);
  });

  it('refuses to add a piece twice or update one that is gone', async () => {
    const { store } = listen();
    await store.add([ruin]);
    await expect(store.add([ruin])).rejects.toThrow('"Ruin" is already in your library.');
    await store.remove('ruin');
    await expect(store.update(ruin)).rejects.toThrow('"Ruin" is no longer in your library.');
    await expect(store.setPhoto(ruin, photo)).rejects.toThrow('"Ruin" is no longer in your');
  });

  it('keeps photos with their pieces until the piece or photo goes', async () => {
    const { store, seen } = listen();
    await store.add([ruin]);
    const withImage = { ...ruin, image: { version: 1, ratio: 1.5 } };
    await store.setPhoto(withImage, photo);
    expect(await store.readPhoto('ruin')).toBe(photo);
    expect(seen.at(-1)?.pieces[0]?.image).toEqual({ version: 1, ratio: 1.5 });
    await store.setPhoto(ruin, null);
    expect(await store.readPhoto('ruin')).toBeNull();
    await store.setPhoto(withImage, photo);
    await store.remove('ruin');
    expect(await store.readPhoto('ruin')).toBeNull();
  });

  it('hands over its pieces and photos, and empties on clear', async () => {
    const { store, seen } = listen();
    await store.add([ruin], new Map([['ruin', photo]]));
    expect(store.pieces()).toEqual([ruin]);
    expect(store.photos().get('ruin')).toBe(photo);
    store.clear();
    expect(store.pieces()).toEqual([]);
    expect(store.photos().size).toBe(0);
    expect(seen.at(-1)?.pieces).toEqual([]);
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
