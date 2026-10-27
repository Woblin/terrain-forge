import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibraryPiece } from '../domain/library';
import { planMove } from '../domain/libraryMerge';
import type { EncodedPhoto } from '../domain/imageCrop';
import type { MemoryLibrary } from '../services/memoryLibrary';
import type { TerrainLibrary } from './libraryContext';
import type { UnsavedPieces } from './unsavedPiecesContext';

/**
 * Offers the pieces kept in memory to the player's account once they can save. An empty account
 * takes them without asking.
 */
export function useUnsavedPieceMove(
  guest: MemoryLibrary,
  account: TerrainLibrary | null,
): UnsavedPieces | null {
  const [unsaved, setUnsaved] = useState<readonly LibraryPiece[]>(() => guest.pieces());
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef<MemoryLibrary | null>(null);

  useEffect(
    () =>
      guest.subscribe({
        onChange: (snapshot) => {
          setUnsaved(snapshot.pieces);
        },
        onError: () => undefined,
        onWriteFailed: () => undefined,
      }),
    [guest],
  );

  const ready = account?.status === 'ready' ? account : null;
  const plan = useMemo(
    () => (ready === null ? null : planMove(unsaved, ready.pieces)),
    [ready, unsaved],
  );

  const move = useCallback(() => {
    if (ready === null || plan === null || started.current === guest) {
      return;
    }
    started.current = guest;
    setMoving(true);
    setError(null);
    const { pieces, photos } = withNewIds(plan.move, guest.photos(), ready.newId);
    void ready.addPieces(pieces, photos).then((failure) => {
      setMoving(false);
      setError(failure);
      if (failure === null) {
        guest.clear();
      } else {
        started.current = null;
      }
    });
  }, [ready, plan, guest]);

  const discard = useCallback(() => {
    guest.clear();
  }, [guest]);

  const accountEmpty = ready !== null && ready.pieces.length === 0;
  const nothingNew =
    plan !== null && unsaved.length > 0 && plan.move.length === 0 && plan.noRoom === 0;
  useEffect(() => {
    if (nothingNew) {
      guest.clear();
    } else if (accountEmpty && unsaved.length > 0) {
      move();
    }
  }, [accountEmpty, nothingNew, unsaved, guest, move]);

  // An empty account takes the pieces without asking; the player only hears if that failed.
  const ask = plan !== null && plan.move.length > 0 && (!accountEmpty || error !== null);
  return useMemo(
    () => (ask ? { plan, moving, error, move, discard } : null),
    [ask, plan, moving, error, move, discard],
  );
}

/** Account pieces get ids from the account; their photos follow them. */
function withNewIds(
  pieces: readonly LibraryPiece[],
  photos: ReadonlyMap<string, EncodedPhoto>,
  newId: () => string,
): { pieces: LibraryPiece[]; photos: Map<string, EncodedPhoto> } {
  const moved: LibraryPiece[] = [];
  const movedPhotos = new Map<string, EncodedPhoto>();
  for (const piece of pieces) {
    const id = newId();
    const photo = photos.get(piece.id);
    moved.push({ ...piece, id, image: photo === undefined ? null : piece.image });
    if (photo !== undefined) {
      movedPhotos.set(id, photo);
    }
  }
  return { pieces: moved, photos: movedPhotos };
}
