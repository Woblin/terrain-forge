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
import type { LibraryPiece } from '../../src/domain/library';
import { createFirestoreLibrary } from '../../src/services/terrainLibrary';
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

function asAlice(): Firestore {
  return firestoreOf(env.authenticatedContext('alice'));
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

  it('keep other players and signed-out visitors out', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), newPiece()));
    const bob = firestoreOf(env.authenticatedContext('bob'));
    const nobody = firestoreOf(env.unauthenticatedContext());
    await assertFails(getDoc(doc(bob, path)));
    await assertFails(getDoc(doc(nobody, path)));
    await assertFails(setDoc(doc(bob, 'users/alice/terrainPieces/other'), newPiece()));
    await assertFails(deleteDoc(doc(bob, path)));
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

  it.each([
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
});

describe('the Firestore library service', () => {
  /** Waits up to two seconds for the listener to catch up. */
  async function waitUntil(condition: () => boolean): Promise<void> {
    for (let tries = 0; tries < 100 && !condition(); tries++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  it('adds, updates and deletes pieces within the rules, and reads them back', async () => {
    const library = createFirestoreLibrary(asAlice(), 'alice');
    const seen: LibrarySnapshot[] = [];
    const errors: string[] = [];
    const stop = library.subscribe(
      (snapshot) => seen.push(snapshot),
      (message) => errors.push(message),
    );
    try {
      const id = library.newId();
      await library.add([{ ...ruin, id }]);
      await library.update({ ...ruin, id, quantity: 6, image: { version: 1, ratio: 2 } });
      const stored = await getDoc(doc(asAlice(), `users/alice/terrainPieces/${id}`));
      expect(stored.data()).toMatchObject({ quantity: 6, image: { version: 1, ratio: 2 } });
      await setDoc(doc(asAlice(), `users/alice/terrainImages/${id}`), image());
      await library.remove(id);
      expect((await getDoc(doc(asAlice(), `users/alice/terrainImages/${id}`))).exists()).toBe(
        false,
      );
      await waitUntil(() => seen.at(-1)?.pieces.length === 0);
      expect(seen.at(-1)?.pieces).toEqual([]);
      expect(seen.some((snapshot) => snapshot.pieces[0]?.quantity === 6)).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      stop();
    }
  });

  it('turns a refused write into a message for the player', async () => {
    const library = createFirestoreLibrary(asAlice(), 'alice');
    await expect(library.update(ruin)).rejects.toThrow(
      'Could not save "Large ruin". Check your connection and try again.',
    );
    const bobsView = createFirestoreLibrary(firestoreOf(env.authenticatedContext('bob')), 'alice');
    await expect(bobsView.add([ruin])).rejects.toThrow('Could not save "Large ruin".');
  });
});
