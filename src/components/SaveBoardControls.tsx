import { CopyIcon, SaveIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { copyName, type OpenedBoard } from '../domain/savedBoard';
import type { SavedBoardsAccess } from '../hooks/savedBoardsContext';
import { BoardNameDialog } from './BoardNameDialog';
import { BUTTON_STYLES } from './buttonStyles';

interface SaveBoardControlsProps {
  access: SavedBoardsAccess;
  /** The saved board on the page, or null for a board that is not saved. */
  opened: OpenedBoard | null;
  /** The name the board is saved under. */
  name: string;
  /** False until there is a board to save. */
  hasBoard: boolean;
  error: string | null;
  /** Returns a message when it did not work, or null. */
  onSave: (name: string, asCopy: boolean) => string | null;
}

const BUTTON_SIZE = 'h-[38px] px-3.5 pointer-coarse:h-11';

/** Save board, and Save as copy for a board that is saved already; or a way to sign in. */
export function SaveBoardControls({
  access,
  opened,
  name,
  hasBoard,
  error,
  onSave,
}: SaveBoardControlsProps) {
  const location = useLocation();
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (access === 'signedOut') {
    return (
      <Link
        to="/sign-in"
        state={{ from: location.pathname }}
        className={`${BUTTON_STYLES.primary} ${BUTTON_SIZE} text-[17px]`}
      >
        <SaveIcon className="size-4" aria-hidden="true" />
        Sign in to save
      </Link>
    );
  }
  if (access === 'unverified') {
    return <p className="text-soft text-sm">Verify your email to save boards.</p>;
  }
  const problem = message ?? error;
  return (
    <>
      {opened !== null && (
        <button
          type="button"
          disabled={!hasBoard}
          onClick={() => {
            setCopying(true);
          }}
          className={`${BUTTON_STYLES.secondary} ${BUTTON_SIZE} bg-iron-raised/70`}
        >
          <CopyIcon className="size-4" aria-hidden="true" />
          Save as copy
        </button>
      )}
      <button
        type="button"
        disabled={!hasBoard}
        onClick={() => {
          setMessage(onSave(name, false));
        }}
        className={`${BUTTON_STYLES.primary} ${BUTTON_SIZE} text-[17px]`}
      >
        <SaveIcon className="size-4" aria-hidden="true" />
        Save board
      </button>
      {problem !== null && (
        <p role="alert" className="text-fail basis-full text-right text-sm">
          {problem}
        </p>
      )}
      {copying && opened !== null && (
        <BoardNameDialog
          title="Save as a copy"
          initialName={copyName(opened.name)}
          confirmLabel="Save copy"
          onConfirm={(copy) => {
            const failure = onSave(copy, true);
            if (failure === null) {
              setCopying(false);
              setMessage(null);
            }
            return failure;
          }}
          onCancel={() => {
            setCopying(false);
          }}
        />
      )}
    </>
  );
}
