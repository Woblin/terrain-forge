import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';
import type { LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
import type { LibrarySnapshot, LibraryStore } from './libraryStore';
import { imageDocument, parseImageDocument } from './terrainImageSchema';
import { parsePieceDocument, pieceDocument } from './terrainLibrarySchema';

const PIECES = 'terrainPieces';
/** Photos live beside the pieces, one document per piece, as the photo plan sets out. */
const IMAGES = 'terrainImages';

/**
 * A player's library in Firestore, under `users/{uid}/terrainPieces`. Writes show at once and are
 * sent in the background, so the page keeps working offline; Firestore sends them once the
 * connection is back, and a refusal from the server reaches `onWriteFailed`.
 */
export function createFirestoreLibrary(db: Firestore, uid: string): LibraryStore {
  const pieces = collection(db, 'users', uid, PIECES);
  const images = collection(db, 'users', uid, IMAGES);
  const writeFailed = new Set<(message: string) => void>();

  /** Sends a batch without waiting for the server, and reports a later refusal. */
  function send(batch: WriteBatch, failure: string): void {
    batch.commit().catch((error: unknown) => {
      console.error(failure, error);
      for (const listener of writeFailed) {
        listener(failure);
      }
    });
  }

  function setPiece(batch: WriteBatch, piece: LibraryPiece): void {
    batch.update(doc(pieces, piece.id), { ...pieceDocument(piece), updatedAt: serverTimestamp() });
  }

  async function setImage(
    batch: WriteBatch,
    pieceId: string,
    photo: EncodedPhoto,
    ratio: number,
  ): Promise<void> {
    batch.set(doc(images, pieceId), {
      ...(await imageDocument(photo, ratio)),
      updatedAt: serverTimestamp(),
    });
  }

  return {
    persistent: true,
    subscribe({ onChange, onError, onWriteFailed }) {
      writeFailed.add(onWriteFailed);
      const stop = onSnapshot(
        pieces,
        { includeMetadataChanges: true },
        (snapshot) => {
          onChange(
            readSnapshot(
              snapshot.docs.map((entry) => [entry.id, entry.data()] as const),
              snapshot.metadata.hasPendingWrites,
            ),
          );
        },
        (error) => {
          console.error('Reading the terrain library failed.', error);
          onError(
            'Could not load your terrain library. Check your connection and reload the page.',
          );
        },
      );
      return () => {
        writeFailed.delete(onWriteFailed);
        stop();
      };
    },
    newId() {
      return doc(pieces).id;
    },
    async add(added, photos = new Map()) {
      const batch = writeBatch(db);
      for (const piece of added) {
        batch.set(doc(pieces, piece.id), {
          ...pieceDocument(piece),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const photo = photos.get(piece.id);
        if (photo !== undefined && piece.image !== null) {
          await setImage(batch, piece.id, photo, piece.image.ratio);
        }
      }
      send(batch, saveFailure(added));
    },
    update(piece) {
      const batch = writeBatch(db);
      setPiece(batch, piece);
      send(batch, `Could not save "${piece.name}". Your change was undone.`);
      return Promise.resolve();
    },
    remove(pieceId) {
      const batch = writeBatch(db);
      batch.delete(doc(pieces, pieceId));
      batch.delete(doc(images, pieceId));
      send(batch, 'Could not delete the piece. It is back in your library.');
      return Promise.resolve();
    },
    async setPhoto(piece, photo) {
      const batch = writeBatch(db);
      setPiece(batch, piece);
      if (photo === null || piece.image === null) {
        batch.delete(doc(images, piece.id));
      } else {
        await setImage(batch, piece.id, photo, piece.image.ratio);
      }
      send(batch, `Could not save the photo of "${piece.name}". Your change was undone.`);
    },
    async readPhoto(pieceId) {
      const stored = await getDoc(doc(images, pieceId)).catch((error: unknown) => {
        console.error('Reading a photo failed.', error);
        throw new Error('Could not load a photo. Check your connection and reload the page.', {
          cause: error,
        });
      });
      return stored.exists() ? parseImageDocument(pieceId, stored.data()) : null;
    },
  };
}

/** Deletes every piece and photo of a player, for when they delete their account. */
export async function deleteLibrary(db: Firestore, uid: string): Promise<void> {
  const user = doc(db, 'users', uid);
  const stored = await Promise.all([PIECES, IMAGES].map((name) => getDocs(collection(user, name))));
  const batch = writeBatch(db);
  for (const entry of stored.flatMap((snapshot) => snapshot.docs)) {
    batch.delete(entry.ref);
  }
  await batch.commit();
}

/** Keeps the pieces that pass validation and names the ones that do not. */
export function readSnapshot(
  entries: readonly (readonly [string, unknown])[],
  saving = false,
): LibrarySnapshot {
  const parsed = entries.map(([id, data]) => parsePieceDocument(id, data));
  return {
    pieces: parsed.flatMap((result) => (result.ok ? [result.piece] : [])),
    problems: parsed.flatMap((result) => (result.ok ? [] : [result.problem])),
    saving,
  };
}

function saveFailure(pieces: readonly LibraryPiece[]): string {
  const [only] = pieces;
  return pieces.length === 1 && only !== undefined
    ? `Could not save "${only.name}". It was taken out of your library again.`
    : `Could not save ${String(pieces.length)} pieces. They were taken out of your library again.`;
}
