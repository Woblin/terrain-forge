import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type CollectionReference,
  type Firestore,
} from 'firebase/firestore';
import type { LibraryPiece } from '../domain/library';
import type { LibrarySnapshot, LibraryStore } from './libraryStore';
import { parsePieceDocument, pieceDocument } from './terrainLibrarySchema';

const PIECES = 'terrainPieces';
/** Photos live beside the pieces, one document per piece, as the photo plan sets out. */
const IMAGES = 'terrainImages';

/** A player's library in Firestore, under `users/{uid}/terrainPieces`. */
export function createFirestoreLibrary(db: Firestore, uid: string): LibraryStore {
  const pieces = collection(db, 'users', uid, PIECES);

  return {
    persistent: true,
    subscribe(onChange, onError) {
      return onSnapshot(
        pieces,
        (snapshot) => {
          onChange(readSnapshot(snapshot.docs.map((entry) => [entry.id, entry.data()] as const)));
        },
        (error) => {
          console.error('Reading the terrain library failed.', error);
          onError(
            'Could not load your terrain library. Check your connection and reload the page.',
          );
        },
      );
    },
    newId() {
      return doc(pieces).id;
    },
    async add(added) {
      const batch = writeBatch(db);
      for (const piece of added) {
        batch.set(doc(pieces, piece.id), {
          ...pieceDocument(piece),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await attempt(batch.commit(), saveFailure(added));
    },
    async update(piece) {
      await attempt(
        updateDoc(doc(pieces, piece.id), { ...pieceDocument(piece), updatedAt: serverTimestamp() }),
        `Could not save "${piece.name}". Check your connection and try again.`,
      );
    },
    async remove(pieceId) {
      const batch = writeBatch(db);
      batch.delete(doc(pieces, pieceId));
      batch.delete(doc(imagesOf(pieces), pieceId));
      await attempt(
        batch.commit(),
        'Could not delete the piece. Check your connection and try again.',
      );
    },
  };
}

/** Keeps the pieces that pass validation and names the ones that do not. */
export function readSnapshot(entries: readonly (readonly [string, unknown])[]): LibrarySnapshot {
  const parsed = entries.map(([id, data]) => parsePieceDocument(id, data));
  return {
    pieces: parsed.flatMap((result) => (result.ok ? [result.piece] : [])),
    problems: parsed.flatMap((result) => (result.ok ? [] : [result.problem])),
  };
}

function imagesOf(pieces: CollectionReference): CollectionReference {
  const user = pieces.parent;
  if (user === null) {
    throw new Error('Terrain pieces must belong to a user.');
  }
  return collection(user, IMAGES);
}

function saveFailure(pieces: readonly LibraryPiece[]): string {
  const [only] = pieces;
  return pieces.length === 1 && only !== undefined
    ? `Could not save "${only.name}". Check your connection and try again.`
    : `Could not save ${String(pieces.length)} pieces. Check your connection and try again.`;
}

/** Turns a failed write into an error the player can read, keeping the cause for debugging. */
async function attempt(write: Promise<void>, message: string): Promise<void> {
  try {
    await write;
  } catch (error) {
    console.error(message, error);
    throw new Error(message, { cause: error });
  }
}
