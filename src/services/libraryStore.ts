import type { LibraryPiece } from '../domain/library';

/** What a store reports each time the library changes. */
export interface LibrarySnapshot {
  readonly pieces: readonly LibraryPiece[];
  /** Saved pieces that could not be read, as messages for the player. */
  readonly problems: readonly string[];
}

/**
 * Where a player's terrain library is kept. Writes reject with an `Error` whose message can be
 * shown to the player.
 */
export interface LibraryStore {
  /** True when the library outlives a page reload. */
  readonly persistent: boolean;
  /**
   * Calls `onChange` with the whole library now or soon, and again after every change.
   * Returns a function that stops listening.
   */
  subscribe(
    onChange: (snapshot: LibrarySnapshot) => void,
    onError: (message: string) => void,
  ): () => void;
  /** A fresh id for a piece that has not been saved yet. */
  newId(): string;
  /** Adds new pieces, all or none. */
  add(pieces: readonly LibraryPiece[]): Promise<void>;
  /** Replaces a piece already in the library. */
  update(piece: LibraryPiece): Promise<void>;
  /** Deletes a piece and its photo. */
  remove(pieceId: string): Promise<void>;
}
