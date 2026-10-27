import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { SavedBoard, SavedBoardContent } from '../domain/savedBoard';
import { boardDocument, parseBoardDocument } from './savedBoardSchema';

const BOARDS = 'boards';

/** What the account's boards look like now. */
export interface SavedBoardsSnapshot {
  /** Newest first. */
  readonly boards: readonly SavedBoard[];
  /** Saved boards that could not be read, as messages for the player. */
  readonly problems: readonly string[];
  /** True while changes are kept on this device and not yet saved, for example when offline. */
  readonly saving: boolean;
}

export interface SavedBoardsListeners {
  readonly onChange: (snapshot: SavedBoardsSnapshot) => void;
  /** The boards could not be loaded at all. */
  readonly onError: (message: string) => void;
  /** A change the page already shows was refused later, and has been undone. */
  readonly onWriteFailed: (message: string) => void;
}

/**
 * A player's boards in Firestore, under `users/{uid}/boards`. Writes show at once and are sent in
 * the background, so the page keeps working offline; a refusal from the server reaches
 * `onWriteFailed`.
 */
export interface SavedBoardStore {
  /** Calls `onChange` with every board now or soon, and again after each change. */
  subscribe(listeners: SavedBoardsListeners): () => void;
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
  const boards = collection(db, 'users', uid, BOARDS);
  const writeFailed = new Set<(message: string) => void>();

  /** Sends a write without waiting for the server, and reports a later refusal. */
  function send(write: Promise<void>, failure: string): void {
    write.catch((error: unknown) => {
      console.error(failure, error);
      for (const listener of writeFailed) {
        listener(failure);
      }
    });
  }

  return {
    subscribe({ onChange, onError, onWriteFailed }) {
      writeFailed.add(onWriteFailed);
      const stop = onSnapshot(
        boards,
        { includeMetadataChanges: true },
        (snapshot) => {
          onChange(
            readBoards(
              snapshot.docs.map(
                (entry) => [entry.id, entry.data({ serverTimestamps: 'estimate' })] as const,
              ),
              snapshot.metadata.hasPendingWrites,
            ),
          );
        },
        (error) => {
          console.error('Reading the saved boards failed.', error);
          onError('Could not load your saved boards. Check your connection and reload the page.');
        },
      );
      return () => {
        writeFailed.delete(onWriteFailed);
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
      const batch = writeBatch(db);
      batch.delete(doc(boards, boardId));
      send(batch.commit(), 'Could not delete the board. It is back in your list.');
    },
  };
}

/** Deletes every saved board of a player, for when they delete their account. */
export async function deleteSavedBoards(db: Firestore, uid: string): Promise<void> {
  const stored = await getDocs(collection(db, 'users', uid, BOARDS));
  const batch = writeBatch(db);
  for (const entry of stored.docs) {
    batch.delete(entry.ref);
  }
  await batch.commit();
}

/** Keeps the boards that pass validation, newest first, and names the ones that do not. */
export function readBoards(
  entries: readonly (readonly [string, Record<string, unknown>])[],
  saving = false,
): SavedBoardsSnapshot {
  const parsed = entries.map(([boardId, data]) =>
    parseBoardDocument(boardId, data, savedAtOf(data.updatedAt)),
  );
  return {
    boards: parsed
      .flatMap((result) => (result.ok ? [result.board] : []))
      .sort((a, b) => b.savedAt - a.savedAt),
    problems: parsed.flatMap((result) => (result.ok ? [] : [result.problem])),
    saving,
  };
}

function savedAtOf(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}
