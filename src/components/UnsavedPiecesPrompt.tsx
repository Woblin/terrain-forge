import { useEffect, useId, useRef } from 'react';
import { useUnsavedPieces } from '../hooks/unsavedPiecesContext';
import { BUTTON_STYLES } from './buttonStyles';

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
      className="parchment frame m-auto max-w-[calc(100vw-2rem)] rounded-sm p-0 backdrop:bg-black/70"
    >
      <div className="max-w-sm space-y-4 p-6">
        <h2 id={`${id}-title`} className="font-display text-[22px] leading-tight">
          Save the terrain you just made?
        </h2>
        <div id={`${id}-message`} className="text-soft space-y-2 text-sm">
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
          <p role="alert" className="text-fail text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={moving}
            onClick={discard}
            className={BUTTON_STYLES.secondary}
          >
            Discard
          </button>
          <button type="button" disabled={moving} onClick={move} className={BUTTON_STYLES.primary}>
            {moving ? 'Adding…' : 'Add to my account'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
