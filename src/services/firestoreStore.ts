import {
  onSnapshot,
  writeBatch,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type SnapshotOptions,
} from 'firebase/firestore';

/** What a store tells the page that follows it. */
export interface StoreListeners<Snapshot> {
  readonly onChange: (snapshot: Snapshot) => void;
  /** The data could not be loaded at all. */
  readonly onError: (message: string) => void;
  /** A change the page already shows was refused later, and has been undone. */
  readonly onWriteFailed: (message: string) => void;
}

/** A stored document after validation: what the app uses, or a message for the player. */
export type Parsed<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problem: string };

/** The id and fields of each document in a collection. */
export type StoredEntries = readonly (readonly [string, Record<string, unknown>])[];

/** Most writes Firestore takes in one batch. */
const BATCH_LIMIT = 500;

/**
 * Sends writes without waiting for the server, so the page keeps working offline, and tells every
 * listener about a later refusal.
 */
export function createWriteReporter(): {
  readonly listen: (onWriteFailed: (message: string) => void) => () => void;
  readonly send: (write: Promise<void>, failure: string) => void;
} {
  const listeners = new Set<(message: string) => void>();
  return {
    listen: (onWriteFailed) => {
      listeners.add(onWriteFailed);
      return () => {
        listeners.delete(onWriteFailed);
      };
    },
    send: (write, failure) => {
      write.catch((error: unknown) => {
        console.error(failure, error);
        for (const listener of listeners) {
          listener(failure);
        }
      });
    },
  };
}

/**
 * Follows a collection, including changes not yet saved, and hands each change to `read`. A failed
 * load reaches `onError` with `failure`.
 */
export function followCollection<Snapshot>(
  ref: CollectionReference,
  onChange: (snapshot: Snapshot) => void,
  onError: (message: string) => void,
  read: (entries: StoredEntries, saving: boolean) => Snapshot,
  failure: string,
  options?: SnapshotOptions,
): () => void {
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange(
        read(
          snapshot.docs.map((entry) => [entry.id, entry.data(options)] as const),
          snapshot.metadata.hasPendingWrites,
        ),
      );
    },
    (error) => {
      console.error(failure, error);
      onError(failure);
    },
  );
}

/** The documents that passed validation, and the messages for those that did not. */
export function partitionParsed<T>(results: readonly Parsed<T>[]): {
  readonly values: T[];
  readonly problems: string[];
} {
  return {
    values: results.flatMap((result) => (result.ok ? [result.value] : [])),
    problems: results.flatMap((result) => (result.ok ? [] : [result.problem])),
  };
}

/**
 * Deletes the documents in batches Firestore accepts, one batch after the other, so a long list
 * does not fail as a whole.
 */
export async function deleteAll(db: Firestore, refs: readonly DocumentReference[]): Promise<void> {
  for (const part of chunks(refs, BATCH_LIMIT)) {
    const batch = writeBatch(db);
    for (const ref of part) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

/** The items in order, in lists of at most `size`. Exported for the test. */
export function chunks<T>(items: readonly T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    parts.push(items.slice(start, start + size));
  }
  return parts;
}
