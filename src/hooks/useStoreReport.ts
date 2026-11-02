import { useCallback, useEffect, useState } from 'react';
import type { StoreListeners } from '../services/firestoreStore';

export type LoadState<Snapshot> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly snapshot: Snapshot }
  | { readonly status: 'failed'; readonly message: string };

/** What a store last reported, and which store reported it. */
export interface Report<Snapshot, Store> {
  readonly store: Store;
  readonly load: LoadState<Snapshot>;
  readonly writeError: string | null;
}

/** One call a store made to its listeners. */
export type StoreEvent<Snapshot> =
  | { readonly kind: 'change'; readonly snapshot: Snapshot }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'writeFailed'; readonly message: string };

interface Subscribable<Snapshot> {
  subscribe(listeners: StoreListeners<Snapshot>): () => void;
}

const LOADING = { status: 'loading' } as const;

/**
 * Follows a store and keeps what it last reported: the data, a failed load, or a write it refused
 * later. A store that is swapped for another starts over at loading; with no store, nothing is
 * followed.
 */
export function useStoreReport<Snapshot>(store: Subscribable<Snapshot> | null): {
  readonly load: LoadState<Snapshot>;
  readonly writeError: string | null;
  readonly clearWriteError: () => void;
} {
  const [report, setReport] = useState<Report<Snapshot, Subscribable<Snapshot> | null>>(() =>
    fresh(store),
  );

  useEffect(() => {
    if (store === null) {
      return;
    }
    const after = (event: StoreEvent<Snapshot>) => {
      setReport((previous) => reportAfter(previous, store, event));
    };
    return store.subscribe({
      onChange: (snapshot) => {
        after({ kind: 'change', snapshot });
      },
      onError: (message) => {
        after({ kind: 'error', message });
      },
      onWriteFailed: (message) => {
        after({ kind: 'writeFailed', message });
      },
    });
  }, [store]);

  const clearWriteError = useCallback(() => {
    setReport((previous) =>
      previous.writeError === null ? previous : { ...previous, writeError: null },
    );
  }, []);

  // A report from the store used before is not about this one.
  const { load, writeError } = report.store === store ? report : fresh<Snapshot, null>(null);
  return { load, writeError, clearWriteError };
}

/** The next report after an event from `store`. Exported for the test. */
export function reportAfter<Snapshot, Store>(
  previous: Report<Snapshot, Store>,
  store: Store,
  event: StoreEvent<Snapshot>,
): Report<Snapshot, Store> {
  const same = previous.store === store;
  switch (event.kind) {
    case 'change':
      return {
        store,
        load: { status: 'ready', snapshot: event.snapshot },
        writeError: same ? previous.writeError : null,
      };
    case 'error':
      return { store, load: { status: 'failed', message: event.message }, writeError: null };
    case 'writeFailed':
      return { store, load: same ? previous.load : LOADING, writeError: event.message };
  }
}

function fresh<Snapshot, Store>(store: Store): Report<Snapshot, Store> {
  return { store, load: LOADING, writeError: null };
}
