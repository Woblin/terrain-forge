import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Bytes,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { EncodedPhoto } from '../../src/domain/imageCrop';
import type { LibraryPiece } from '../../src/domain/library';
import { TERRAIN_TYPES } from '../../src/domain/terrain';
import { createFirestoreLibrary, deleteLibrary } from '../../src/services/terrainLibrary';
import type { LibrarySnapshot } from '../../src/services/libraryStore';
import { pieceDocument } from '../../src/services/terrainLibrarySchema';

let env: RulesTestEnvironment;

const ruin: LibraryPiece = {
  id: 'ruin-1',
  name: 'Large ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 12, depth: 6 },
  quantity: 4,
  image: null,
};

/** The test contexts hand out the compat Firestore; the modular functions accept it. */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

/** Alice has verified her email, so she may save. */
function asAlice(): Firestore {
  return firestoreOf(env.authenticatedContext('alice', { email_verified: true }));
}

function asUnverifiedAlice(): Firestore {
  return firestoreOf(env.authenticatedContext('alice', { email_verified: false }));
}

function newPiece(fields: Record<string, unknown> = {}) {
  return {
    ...pieceDocument(ruin),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...fields,
  };
}

function image(fields: Record<string, unknown> = {}) {
  return {
    data: Bytes.fromUint8Array(new Uint8Array(1000)),
    mimeType: 'image/webp',
    width: 384,
    height: 192,
    ratio: 2,
    updatedAt: serverTimestamp(),
    ...fields,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-terrain-forge',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env.cleanup();
});

describe('terrain pieces', () => {
  const path = 'users/alice/terrainPieces/ruin-1';

  it('let the owner create, read, update and delete a valid piece', async () => {
    const db = asAlice();
    await assertSucceeds(setDoc(doc(db, path), newPiece()));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(updateDoc(doc(db, path), { quantity: 6, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('accept every terrain type the app knows, walls included', async () => {
    const db = asAlice();
    for (const type of TERRAIN_TYPES) {
      await assertSucceeds(
        setDoc(doc(db, `users/alice/terrainPieces/${type}`), newPiece({ type })),
      );
    }
  });

  it('keep other players and signed-out visitors out', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), newPiece()));
    const bob = firestoreOf(env.authenticatedContext('bob'));
    const nobody = firestoreOf(env.unauthenticatedContext());
    await assertFails(getDoc(doc(bob, path)));
    await assertFails(getDoc(doc(nobody, path)));
    await assertFails(setDoc(doc(bob, 'users/alice/terrainPieces/other'), newPiece()));
    await assertFails(deleteDoc(doc(bob, path)));
  });

  it('let an owner without a verified email read and delete, but not save', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), newPiece()));
    const unverified = asUnverifiedAlice();
    await assertFails(setDoc(doc(unverified, 'users/alice/terrainPieces/new'), newPiece()));
    await assertFails(
      updateDoc(doc(unverified, path), { quantity: 6, updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(getDoc(doc(unverified, path)));
    await assertSucceeds(deleteDoc(doc(unverified, path)));
  });

  it.each([
    ['an unknown type', { type: 'river' }],
    ['a side over 36 inches', { footprint: { kind: 'rect', width: 40, depth: 6 } }],
    ['a side under half an inch', { footprint: { kind: 'ellipse', width: 0.4, depth: 6 } }],
    ['an unknown shape', { footprint: { kind: 'star', width: 6, depth: 6 } }],
    ['a fractional quantity', { quantity: 1.5 }],
    ['too many copies', { quantity: 21 }],
    ['an empty name', { name: '' }],
    ['a name over 40 characters', { name: 'x'.repeat(41) }],
    ['an extra field', { colour: 'red' }],
    ['a bad photo reference', { image: { version: 0, ratio: 2 } }],
    ['another schema version', { schemaVersion: 2 }],
    ['a client clock time', { updatedAt: Timestamp.now() }],
  ])('refuse a piece with %s', async (_, fields) => {
    await assertFails(setDoc(doc(asAlice(), path), newPiece(fields)));
  });

  it('refuse a piece with a missing field', async () => {
    const missing: Record<string, unknown> = newPiece();
    delete missing.quantity;
    await assertFails(setDoc(doc(asAlice(), path), missing));
  });

  it('keep the creation time on update', async () => {
    const db = asAlice();
    await assertSucceeds(setDoc(doc(db, path), newPiece()));
    await assertFails(
      updateDoc(doc(db, path), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it('allow no other collection under a player', async () => {
    await assertFails(setDoc(doc(asAlice(), 'users/alice/anything/else'), { a: 1 }));
    await assertFails(getDoc(doc(asAlice(), 'users/alice/anything/else')));
  });
});

describe('terrain images', () => {
  const path = 'users/alice/terrainImages/ruin-1';

  it('let the owner save a small photo', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), image()));
    await assertSucceeds(getDoc(doc(asAlice(), path)));
  });

  it('let the owner save a photo with a small mask of hidden parts', async () => {
    const mask = Bytes.fromUint8Array(new Uint8Array(32 * 1024));
    await assertSucceeds(setDoc(doc(asAlice(), path), image({ mask })));
  });

  it.each([
    ['with a mask over 32 KB', { mask: Bytes.fromUint8Array(new Uint8Array(32 * 1024 + 1)) }],
    ['with a mask as text', { mask: 'aGVsbG8=' }],
    ['over 150 KB', { data: Bytes.fromUint8Array(new Uint8Array(150 * 1024 + 1)) }],
    ['as text instead of bytes', { data: 'aGVsbG8=' }],
    ['as a PNG', { mimeType: 'image/png' }],
    ['larger than 384 pixels', { width: 385 }],
  ])('refuse a photo %s', async (_, fields) => {
    await assertFails(setDoc(doc(asAlice(), path), image(fields)));
  });

  it('keep other players out', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), image()));
    await assertFails(getDoc(doc(firestoreOf(env.authenticatedContext('bob')), path)));
  });

  it('need a verified email to save, but not to delete', async () => {
    await assertFails(setDoc(doc(asUnverifiedAlice(), path), image()));
    await assertSucceeds(setDoc(doc(asAlice(), path), image()));
    await assertSucceeds(deleteDoc(doc(asUnverifiedAlice(), path)));
  });
});

describe('the Firestore library service', () => {
  /** Waits up to two seconds for the listener to catch up. */
  async function waitUntil(condition: () => boolean): Promise<void> {
    for (let tries = 0; tries < 100 && !condition(); tries++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  function follow(db: Firestore, uid = 'alice') {
    const library = createFirestoreLibrary(db, uid);
    const seen: LibrarySnapshot[] = [];
    const errors: string[] = [];
    const refused: string[] = [];
    const stop = library.subscribe({
      onChange: (snapshot) => seen.push(snapshot),
      onError: (message) => errors.push(message),
      onWriteFailed: (message) => refused.push(message),
    });
    return { library, seen, errors, refused, stop };
  }

  const photo: EncodedPhoto = {
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/webp' }),
    width: 384,
    height: 192,
    mimeType: 'image/webp',
    mask: null,
  };

  it('adds, updates and deletes pieces within the rules, and reads them back', async () => {
    const { library, seen, errors, refused, stop } = follow(asAlice());
    try {
      const id = library.newId();
      await library.add([{ ...ruin, id }]);
      await library.update({ ...ruin, id, quantity: 6 });
      await waitUntil(() => seen.at(-1)?.pieces[0]?.quantity === 6 && !seen.at(-1)?.saving);
      const stored = await getDoc(doc(asAlice(), `users/alice/terrainPieces/${id}`));
      expect(stored.data()).toMatchObject({ quantity: 6, image: null });
      expect(seen.some((snapshot) => snapshot.saving)).toBe(true);
      await library.remove(id);
      await waitUntil(() => seen.at(-1)?.pieces.length === 0 && !seen.at(-1)?.saving);
      expect(seen.at(-1)?.pieces).toEqual([]);
      expect(errors).toEqual([]);
      expect(refused).toEqual([]);
    } finally {
      stop();
    }
  });

  it('saves photos with their pieces, reads them back, and deletes them', async () => {
    const { library, seen, refused, stop } = follow(asAlice());
    try {
      const id = library.newId();
      const withImage = { ...ruin, id, image: { version: 1, ratio: 2 } };
      await library.add([withImage], new Map([[id, photo]]));
      await waitUntil(() => seen.at(-1)?.saving === false && seen.at(-1)?.pieces.length === 1);
      const read = await library.readPhoto(id);
      expect(read).toMatchObject({ width: 384, height: 192, mimeType: 'image/webp' });
      expect(new Uint8Array(await (read?.blob.arrayBuffer() ?? new ArrayBuffer(0)))).toEqual(
        new Uint8Array([1, 2, 3, 4]),
      );

      const mask = new Blob([new Uint8Array([5, 6, 7])], { type: 'image/png' });
      await library.setPhoto({ ...withImage, image: { version: 2, ratio: 2 } }, { ...photo, mask });
      await waitUntil(() => seen.at(-1)?.saving === false);
      const masked = await library.readPhoto(id);
      expect(new Uint8Array(await (masked?.mask?.arrayBuffer() ?? new ArrayBuffer(0)))).toEqual(
        new Uint8Array([5, 6, 7]),
      );
      expect(masked?.mask?.type).toBe('image/png');
      expect(read?.mask).toBeNull();

      await library.setPhoto({ ...withImage, image: null }, null);
      await waitUntil(
        () => seen.at(-1)?.saving === false && seen.at(-1)?.pieces[0]?.image === null,
      );
      expect(seen.at(-1)?.pieces[0]?.image).toBeNull();
      expect(await library.readPhoto(id)).toBeNull();

      await library.setPhoto(withImage, photo);
      await library.remove(id);
      await waitUntil(() => seen.at(-1)?.saving === false && seen.at(-1)?.pieces.length === 0);
      expect((await getDoc(doc(asAlice(), `users/alice/terrainImages/${id}`))).exists()).toBe(
        false,
      );
      expect(refused).toEqual([]);
    } finally {
      stop();
    }
  });

  it('reports a write the server refuses, after showing it', async () => {
    const unverified = follow(asUnverifiedAlice());
    try {
      await unverified.library.add([ruin]);
      await waitUntil(() => unverified.refused.length > 0);
      expect(unverified.refused).toEqual([
        'Could not save "Large ruin". It was taken out of your library again.',
      ]);
      await waitUntil(() => unverified.seen.at(-1)?.pieces.length === 0);
      expect(unverified.seen.some((snapshot) => snapshot.pieces.length === 1)).toBe(true);
      expect(unverified.seen.at(-1)?.pieces).toEqual([]);
    } finally {
      unverified.stop();
    }
  });

  it('deletes everything a player saved, for account deletion', async () => {
    const db = asAlice();
    await setDoc(doc(db, 'users/alice/terrainPieces/a'), newPiece());
    await setDoc(doc(db, 'users/alice/terrainPieces/b'), newPiece());
    await setDoc(doc(db, 'users/alice/terrainImages/a'), image());
    await deleteLibrary(asUnverifiedAlice(), 'alice');
    for (const path of ['terrainPieces/a', 'terrainPieces/b', 'terrainImages/a']) {
      expect((await getDoc(doc(db, `users/alice/${path}`))).exists()).toBe(false);
    }
  });
});
