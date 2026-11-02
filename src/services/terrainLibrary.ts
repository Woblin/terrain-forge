import {
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';
import type { LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';
import { imagesCollection, piecesCollection } from './firestorePaths';
import {
  createWriteReporter,
  deleteAll,
  followCollection,
  partitionParsed,
  type StoredEntries,
} from './firestoreStore';
import type { LibrarySnapshot, LibraryStore } from './libraryStore';
import { imageDocument, parseImageDocument } from './terrainImageSchema';
import { parsePieceDocument, pieceDocument } from './terrainLibrarySchema';

/**
 * A player's library in Firestore, under `users/{uid}/terrainPieces`. Writes show at once and are
 * sent in the background, so the page keeps working offline; Firestore sends them once the
 * connection is back, and a refusal from the server reaches `onWriteFailed`.
 */
export function createFirestoreLibrary(db: Firestore, uid: string): LibraryStore {
  const pieces = piecesCollection(db, uid);
  const images = imagesCollection(db, uid);
  const writes = createWriteReporter();

  function send(batch: WriteBatch, failure: string): void {
    writes.send(batch.commit(), failure);
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
      const stopListening = writes.listen(onWriteFailed);
      const stop = followCollection(
        pieces,
        onChange,
        onError,
        readSnapshot,
        'Could not load your terrain library. Check your connection and reload the page.',
      );
      return () => {
        stopListening();
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
  const stored = await Promise.all(
    [piecesCollection(db, uid), imagesCollection(db, uid)].map((ref) => getDocs(ref)),
  );
  await deleteAll(
    db,
    stored.flatMap((snapshot) => snapshot.docs.map((entry) => entry.ref)),
  );
}

/** Keeps the pieces that pass validation and names the ones that do not. */
export function readSnapshot(entries: StoredEntries, saving = false): LibrarySnapshot {
  const { values, problems } = partitionParsed(
    entries.map(([id, data]) => parsePieceDocument(id, data)),
  );
  return { pieces: values, problems, saving };
}

function saveFailure(pieces: readonly LibraryPiece[]): string {
  const [only] = pieces;
  return pieces.length === 1 && only !== undefined
    ? `Could not save "${only.name}". It was taken out of your library again.`
    : `Could not save ${String(pieces.length)} pieces. They were taken out of your library again.`;
}
