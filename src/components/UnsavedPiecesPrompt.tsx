import { useEffect, useId, useRef } from 'react';
import { useUnsavedPieces } from '../hooks/unsavedPiecesContext';

/** Offers to add the pieces made before signing in to the player's account. */
export function UnsavedPiecesPrompt() {
  const unsaved = useUnsavedPieces();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const open = unsaved !== null;

  useEffect(() => {
    const element = dialog.current;
    if (open) {
      element?.showModal();
    }
    return () => {
      element?.close();
    };
  }, [open]);

  if (unsaved === null) {
    return null;
  }
  const { plan, moving, error, move, discard } = unsaved;
  const count = plan.move.length;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={(event) => {
        event.preventDefault();
      }}
      className="m-auto max-w-[calc(100vw-2rem)] rounded-lg bg-stone-800 p-0 text-stone-100 backdrop:bg-black/70"
    >
      <div className="max-w-sm space-y-4 p-5">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          Save the terrain you just made?
        </h2>
        <div id={`${id}-message`} className="space-y-2 text-sm text-stone-300">
          <p>
            You added {count === 1 ? 'a piece' : `${String(count)} pieces`} before your terrain was
            saved. Add {count === 1 ? 'it' : 'them'} to your account, with any photos?
          </p>
          {plan.alreadySaved > 0 && (
            <p>
              {plan.alreadySaved === 1
                ? 'One other piece is'
                : `${String(plan.alreadySaved)} others are`}{' '}
              already in your account.
            </p>
          )}
          {plan.noRoom > 0 && (
            <p>
              {plan.noRoom === 1 ? 'One piece does' : `${String(plan.noRoom)} pieces do`} not fit in
              your library and will be left out.
            </p>
          )}
        </div>
        {error !== null && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={moving}
            onClick={discard}
            className="rounded border border-stone-500 px-3 py-1.5 hover:bg-stone-700 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={moving}
            onClick={move}
            className="rounded bg-amber-500 px-3 py-1.5 font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {moving ? 'Adding…' : 'Add to my account'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
