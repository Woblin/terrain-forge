import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
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
import type { SavedBoardContent } from '../../src/domain/savedBoard';
import {
  createSavedBoardStore,
  deleteSavedBoards,
  type SavedBoardsSnapshot,
} from '../../src/services/savedBoards';
import { boardDocument } from '../../src/services/savedBoardSchema';

let env: RulesTestEnvironment;

const path = 'users/alice/boards/night';

const content: SavedBoardContent = {
  name: 'Game night',
  layout: {
    board: { width: 72, depth: 48 },
    placements: [{ pieceId: 'ruin', position: { x: 10, y: 20 }, rotation: 0 }],
    seed: 4242,
    presetId: 'warhammer-fantasy',
    deploymentId: 'long-edges',
    generatorVersion: 2,
    enabledRules: ['coverage'],
  },
  pieces: [
    {
      id: 'ruin',
      name: 'Ruin',
      type: 'ruin',
      footprint: { kind: 'rect', width: 6, depth: 4 },
      quantity: 1,
    },
  ],
  edited: false,
  passed: true,
  matId: 'grass',
};

/** The test contexts hand out the compat Firestore; the modular functions accept it. */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

function asAlice(): Firestore {
  return firestoreOf(env.authenticatedContext('alice', { email_verified: true }));
}

function newBoard(fields: Record<string, unknown> = {}) {
  return {
    ...boardDocument(content),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...fields,
  };
}

/** The first list of boards that has as many boards as `count`. */
function boardsWhen(db: Firestore, count: number): Promise<SavedBoardsSnapshot> {
  return new Promise((resolve, reject) => {
    const stop = createSavedBoardStore(db, 'alice').subscribe({
      onChange: (snapshot) => {
        if (snapshot.boards.length === count && !snapshot.saving) {
          stop();
          resolve(snapshot);
        }
      },
      onError: (message) => {
        stop();
        reject(new Error(message));
      },
      onWriteFailed: (message) => {
        stop();
        reject(new Error(message));
      },
    });
  });
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

describe('saved board rules', () => {
  it('let the owner create, read, update, rename and delete a board', async () => {
    const db = asAlice();
    await assertSucceeds(setDoc(doc(db, path), newBoard()));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(
      updateDoc(doc(db, path), { ...boardDocument(content), updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      updateDoc(doc(db, path), { name: 'Rematch', updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('keep other players and signed-out visitors out', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), newBoard()));
    const bob = firestoreOf(env.authenticatedContext('bob', { email_verified: true }));
    const nobody = firestoreOf(env.unauthenticatedContext());
    await assertFails(getDoc(doc(bob, path)));
    await assertFails(getDoc(doc(nobody, path)));
    await assertFails(setDoc(doc(bob, path), newBoard()));
    await assertFails(deleteDoc(doc(bob, path)));
  });

  it('let an owner without a verified email read and delete, but not save', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), newBoard()));
    const unverified = firestoreOf(env.authenticatedContext('alice', { email_verified: false }));
    await assertFails(setDoc(doc(unverified, 'users/alice/boards/other'), newBoard()));
    await assertFails(
      updateDoc(doc(unverified, path), { name: 'X', updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(getDoc(doc(unverified, path)));
    await assertSucceeds(deleteDoc(doc(unverified, path)));
  });

  it('keep the creation time', async () => {
    const db = asAlice();
    await assertSucceeds(setDoc(doc(db, path), newBoard()));
    await assertFails(
      updateDoc(doc(db, path), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it.each([
    ['an empty name', { name: '' }],
    ['a name over 60 characters', { name: 'x'.repeat(61) }],
    ['an empty game id', { presetId: '' }],
    ['a board size that is not a map', { board: 72 }],
    ['a board side of 0', { board: { width: 0, depth: 48 } }],
    ['a seed that is not a whole number', { seed: 1.5 }],
    ['more than 6 rules', { enabledRules: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }],
    ['more than 50 pieces', { pieces: Array.from({ length: 51 }, () => content.pieces[0]) }],
    ['more than 100 placements', { placements: Array.from({ length: 101 }, () => ({})) }],
    ['an edited flag that is not true or false', { edited: 'yes' }],
    ['an empty mat id', { matId: '' }],
    ['a mat id over 40 characters', { matId: 'x'.repeat(41) }],
    ['a mat id that is not text', { matId: 3 }],
    ['an extra field', { photos: [] }],
    ['another schema version', { schemaVersion: 2 }],
    ['a client clock time', { updatedAt: Timestamp.now() }],
  ])('refuse a board with %s', async (_, fields) => {
    await assertFails(setDoc(doc(asAlice(), path), newBoard(fields)));
  });

  it('accept a board saved before mats, without a mat', async () => {
    const withoutMat: Record<string, unknown> = newBoard();
    delete withoutMat.matId;
    await assertSucceeds(setDoc(doc(asAlice(), path), withoutMat));
  });

  it('refuse a board with a missing field', async () => {
    const missing: Record<string, unknown> = newBoard();
    delete missing.passed;
    await assertFails(setDoc(doc(asAlice(), path), missing));
  });
});

describe('the saved board store', () => {
  it('saves, renames and deletes boards, newest first', async () => {
    const db = asAlice();
    const store = createSavedBoardStore(db, 'alice');
    const first = store.newId();
    store.create(first, content);
    await boardsWhen(db, 1);
    const second = store.newId();
    store.create(second, { ...content, name: 'Second' });
    const both = await boardsWhen(db, 2);
    expect(both.boards.map((board) => board.id)).toEqual([second, first]);
    store.rename(first, 'Renamed');
    store.replace(second, { ...content, name: 'Second', edited: true });
    store.remove(second);
    const left = await boardsWhen(db, 1);
    expect(left.boards[0]).toMatchObject({ id: first, name: 'Renamed' });
    expect(left.problems).toEqual([]);
  });

  it('deletes every board of an account', async () => {
    const db = asAlice();
    await setDoc(doc(db, path), newBoard());
    await setDoc(doc(db, 'users/alice/boards/other'), newBoard());
    await deleteSavedBoards(db, 'alice');
    expect(await boardsWhen(db, 0)).toMatchObject({ boards: [] });
  });
});
