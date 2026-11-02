import {
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import type { SavedBoard, SavedBoardContent } from '../domain/savedBoard';
import { boardsCollection } from './firestorePaths';
import {
  createWriteReporter,
  deleteAll,
  followCollection,
  partitionParsed,
  type StoreListeners,
  type StoredEntries,
} from './firestoreStore';
import { boardDocument, parseBoardDocument } from './savedBoardSchema';

/** What the account's boards look like now. */
export interface SavedBoardsSnapshot {
  /** Newest first. */
  readonly boards: readonly SavedBoard[];
  /** Saved boards that could not be read, as messages for the player. */
  readonly problems: readonly string[];
  /** True while changes are kept on this device and not yet saved, for example when offline. */
  readonly saving: boolean;
}

/**
 * A player's boards in Firestore, under `users/{uid}/boards`. Writes show at once and are sent in
 * the background, so the page keeps working offline; a refusal from the server reaches
 * `onWriteFailed`.
 */
export interface SavedBoardStore {
  /** Calls `onChange` with every board now or soon, and again after each change. */
  subscribe(listeners: StoreListeners<SavedBoardsSnapshot>): () => void;
  /** A fresh id for a board that has not been saved yet. */
  newId(): string;
  /** Saves a new board under `boardId`. */
  create(boardId: string, content: SavedBoardContent): void;
  /** Saves a board over the one already stored under `boardId`. */
  replace(boardId: string, content: SavedBoardContent): void;
  rename(boardId: string, name: string): void;
  remove(boardId: string): void;
}

export function createSavedBoardStore(db: Firestore, uid: string): SavedBoardStore {
  const boards = boardsCollection(db, uid);
  const { listen, send } = createWriteReporter();

  return {
    subscribe({ onChange, onError, onWriteFailed }) {
      const stopListening = listen(onWriteFailed);
      const stop = followCollection(
        boards,
        onChange,
        onError,
        readBoards,
        'Could not load your saved boards. Check your connection and reload the page.',
        { serverTimestamps: 'estimate' },
      );
      return () => {
        stopListening();
        stop();
      };
    },
    newId() {
      return doc(boards).id;
    },
    create(boardId, content) {
      send(
        setDoc(doc(boards, boardId), {
          ...boardDocument(content),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        `Could not save "${content.name}". Check your connection and save again.`,
      );
    },
    replace(boardId, content) {
      send(
        updateDoc(doc(boards, boardId), {
          ...boardDocument(content),
          updatedAt: serverTimestamp(),
        }),
        `Could not save "${content.name}". Check your connection and save again.`,
      );
    },
    rename(boardId, name) {
      send(
        updateDoc(doc(boards, boardId), { name, updatedAt: serverTimestamp() }),
        'Could not rename the board. It has its old name again.',
      );
    },
    remove(boardId) {
      send(deleteDoc(doc(boards, boardId)), 'Could not delete the board. It is back in your list.');
    },
  };
}

/** Deletes every saved board of a player, for when they delete their account. */
export async function deleteSavedBoards(db: Firestore, uid: string): Promise<void> {
  const stored = await getDocs(boardsCollection(db, uid));
  await deleteAll(
    db,
    stored.docs.map((entry) => entry.ref),
  );
}

/** Keeps the boards that pass validation, newest first, and names the ones that do not. */
export function readBoards(entries: StoredEntries, saving = false): SavedBoardsSnapshot {
  const { values, problems } = partitionParsed(
    entries.map(([boardId, data]) => parseBoardDocument(boardId, data, savedAtOf(data.updatedAt))),
  );
  return { boards: values.sort((a, b) => b.savedAt - a.savedAt), problems, saving };
}

function savedAtOf(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}
