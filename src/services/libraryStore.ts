import type { LibraryPiece } from '../domain/library';
import type { EncodedPhoto } from '../domain/imageCrop';

/** What a store reports each time the library changes. */
export interface LibrarySnapshot {
  readonly pieces: readonly LibraryPiece[];
  /** Saved pieces that could not be read, as messages for the player. */
  readonly problems: readonly string[];
  /** True while changes are kept on this device and not yet saved, for example when offline. */
  readonly saving: boolean;
}

export interface LibraryListeners {
  readonly onChange: (snapshot: LibrarySnapshot) => void;
  /** The library could not be loaded at all. */
  readonly onError: (message: string) => void;
  /** A change the page already shows was refused later, and has been undone. */
  readonly onWriteFailed: (message: string) => void;
}

/**
 * Where a player's terrain library is kept. Writes resolve once the change shows in the library,
 * which can be before it reaches the server. They reject with an `Error` whose message can be
 * shown to the player when the change cannot even be made; a change refused later is reported
 * through `onWriteFailed`.
 */
export interface LibraryStore {
  /** True when the library outlives a page reload. */
  readonly persistent: boolean;
  /**
   * Calls `onChange` with the whole library now or soon, and again after every change.
   * Returns a function that stops listening.
   */
  subscribe(listeners: LibraryListeners): () => void;
  /** A fresh id for a piece that has not been saved yet. */
  newId(): string;
  /** Adds new pieces, all or none, with any photos they come with, keyed by piece id. */
  add(pieces: readonly LibraryPiece[], photos?: ReadonlyMap<string, EncodedPhoto>): Promise<void>;
  /** Replaces a piece already in the library. */
  update(piece: LibraryPiece): Promise<void>;
  /** Deletes a piece and its photo. */
  remove(pieceId: string): Promise<void>;
  /** Saves a piece whose `image` changed, with its new photo, or without one when it is null. */
  setPhoto(piece: LibraryPiece, photo: EncodedPhoto | null): Promise<void>;
  /** The photo saved for a piece, or null when it has none. */
  readPhoto(pieceId: string): Promise<EncodedPhoto | null>;
}
