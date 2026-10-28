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
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GamePreferences } from '../../src/domain/gamePreferences';
import {
  deleteAccountPreferences,
  saveAccountPreferences,
  watchAccountPreferences,
  type AccountPreferences,
} from '../../src/services/accountPreferences';
import { preferencesDocument } from '../../src/services/gamePreferencesSchema';

let env: RulesTestEnvironment;

const path = 'users/alice/settings/preferences';

const preferences: GamePreferences = {
  defaultPresetId: 'one-page-rules',
  rulesOff: { 'warhammer-40k': ['clearLane'] },
  defaultMatId: 'snow',
};

/** The test contexts hand out the compat Firestore; the modular functions accept it. */
function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

function asAlice(): Firestore {
  return firestoreOf(env.authenticatedContext('alice', { email_verified: true }));
}

function settings(fields: Record<string, unknown> = {}) {
  return { ...preferencesDocument(preferences), updatedAt: serverTimestamp(), ...fields };
}

/** The next value the account's settings take. */
function nextStored(db: Firestore): Promise<AccountPreferences> {
  return new Promise((resolve, reject) => {
    const stop = watchAccountPreferences(db, 'alice', {
      onChange: (stored) => {
        stop();
        resolve(stored);
      },
      onError: (message) => {
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

describe('game settings rules', () => {
  it('let the owner create, read, update and delete their settings', async () => {
    const db = asAlice();
    await assertSucceeds(setDoc(doc(db, path), settings()));
    await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(setDoc(doc(db, path), settings({ defaultPresetId: 'warhammer-40k' })));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('keep other players and signed-out visitors out', async () => {
    await assertSucceeds(setDoc(doc(asAlice(), path), settings()));
    const bob = firestoreOf(env.authenticatedContext('bob', { email_verified: true }));
    const nobody = firestoreOf(env.unauthenticatedContext());
    await assertFails(getDoc(doc(bob, path)));
    await assertFails(getDoc(doc(nobody, path)));
    await assertFails(setDoc(doc(bob, path), settings()));
    await assertFails(deleteDoc(doc(bob, path)));
  });

  it('let an owner without a verified email read, but not save', async () => {
    const unverified = firestoreOf(env.authenticatedContext('alice', { email_verified: false }));
    await assertFails(setDoc(doc(unverified, path), settings()));
    await assertSucceeds(getDoc(doc(unverified, path)));
  });

  it('allow only the one settings document', async () => {
    await assertFails(setDoc(doc(asAlice(), 'users/alice/settings/other'), settings()));
  });

  it.each([
    ['an empty game id', { defaultPresetId: '' }],
    ['a game id over 40 characters', { defaultPresetId: 'x'.repeat(41) }],
    ['a game id that is not text', { defaultPresetId: 3 }],
    ['rules that are not a map', { rulesOff: ['R1'] }],
    ['an empty mat id', { defaultMatId: '' }],
    ['a mat id that is not text', { defaultMatId: 3 }],
    ['an extra field', { unit: 'cm' }],
    ['another schema version', { schemaVersion: 2 }],
    ['a client clock time', { updatedAt: Timestamp.now() }],
  ])('refuse settings with %s', async (_, fields) => {
    await assertFails(setDoc(doc(asAlice(), path), settings(fields)));
  });

  it('accept settings saved before mats, without a mat', async () => {
    const withoutMat: Record<string, unknown> = settings();
    delete withoutMat.defaultMatId;
    await assertSucceeds(setDoc(doc(asAlice(), path), withoutMat));
  });

  it('refuse settings with a missing field', async () => {
    const missing: Record<string, unknown> = settings();
    delete missing.rulesOff;
    await assertFails(setDoc(doc(asAlice(), path), missing));
  });
});

describe('the game settings service', () => {
  it('reports missing settings, then the saved ones', async () => {
    const db = asAlice();
    expect(await nextStored(db)).toEqual({ kind: 'missing' });
    await saveAccountPreferences(db, 'alice', preferences);
    expect(await nextStored(db)).toEqual({ kind: 'found', preferences });
  });

  it('reports settings it cannot read', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(firestoreOf(context), path), { defaultPresetId: 7 });
    });
    expect(await nextStored(asAlice())).toEqual({ kind: 'unreadable' });
  });

  it('deletes the settings', async () => {
    const db = asAlice();
    await saveAccountPreferences(db, 'alice', preferences);
    await deleteAccountPreferences(db, 'alice');
    expect(await nextStored(db)).toEqual({ kind: 'missing' });
  });
});
