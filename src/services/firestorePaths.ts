import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

/**
 * Where each kind of player data lives in Firestore. Each path is guarded by the `match` block in
 * `firestore.rules` named next to it; a new path needs a new block there.
 */

/** The player's terrain pieces, guarded by `match /users/{uid}/terrainPieces/{pieceId}`. */
export function piecesCollection(db: Firestore, uid: string): CollectionReference {
  return collection(db, 'users', uid, 'terrainPieces');
}

/**
 * The player's piece photos, one document per piece beside the pieces, guarded by
 * `match /users/{uid}/terrainImages/{pieceId}`.
 */
export function imagesCollection(db: Firestore, uid: string): CollectionReference {
  return collection(db, 'users', uid, 'terrainImages');
}

/** The player's saved boards, guarded by `match /users/{uid}/boards/{boardId}`. */
export function boardsCollection(db: Firestore, uid: string): CollectionReference {
  return collection(db, 'users', uid, 'boards');
}

/** The player's game settings, guarded by `match /users/{uid}/settings/preferences`. */
export function preferencesDoc(db: Firestore, uid: string): DocumentReference {
  return doc(db, 'users', uid, 'settings', 'preferences');
}
