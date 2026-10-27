import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { copyName, type OpenedBoard } from '../domain/savedBoard';
import type { SavedBoardsAccess } from '../hooks/savedBoardsContext';
import { BoardNameDialog } from './BoardNameDialog';

interface SaveBoardControlsProps {
  access: SavedBoardsAccess;
  /** The saved board on the page, or null for a board that is not saved. */
  opened: OpenedBoard | null;
  unsaved: boolean;
  /** True while a save has not reached the server yet. */
  sending: boolean;
  /** False until there is a board to save. */
  hasBoard: boolean;
  /** The name a new board gets unless the player changes it. */
  defaultName: string;
  error: string | null;
  /** Each returns a message when it did not work, or null. */
  onSave: (name: string, asCopy: boolean) => string | null;
  onRename: (name: string) => void;
}

type Asking = 'save' | 'copy' | 'rename' | null;

/** Saving the board to the account: its name, Save, Save as copy and Rename. */
export function SaveBoardControls({
  access,
  opened,
  unsaved,
  sending,
  hasBoard,
  defaultName,
  error,
  onSave,
  onRename,
}: SaveBoardControlsProps) {
  const location = useLocation();
  const [asking, setAsking] = useState<Asking>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (access !== 'account') {
    return (
      <section
        aria-label="Save board"
        className="border-line bg-surface space-y-2 rounded-2xl border p-4 text-sm shadow-sm"
      >
        {access === 'signedOut' ? (
          <>
            <Link
              to="/sign-in"
              state={{ from: location.pathname }}
              className="border-line-strong hover:bg-hover block w-full rounded-lg border px-3 py-1.5 text-center"
            >
              Sign in to save
            </Link>
            <p className="text-muted text-xs">This board stays here while you sign in.</p>
          </>
        ) : (
          <p className="text-soft">Verify your email to save boards.</p>
        )}
      </section>
    );
  }

  function saveOver(): void {
    if (opened !== null) {
      setMessage(onSave(opened.name, false));
    }
  }

  return (
    <section
      aria-label="Save board"
      className="border-line bg-surface space-y-2 rounded-2xl border p-4 text-sm shadow-sm"
    >
      {opened !== null && (
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="min-w-0 font-semibold break-words">{opened.name}</h2>
          <button
            type="button"
            onClick={() => {
              setAsking('rename');
            }}
            className="text-accent-ink hover:text-accent-ink-hover shrink-0 underline"
          >
            Rename
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!hasBoard}
          onClick={() => {
            if (opened === null) {
              setAsking('save');
            } else {
              saveOver();
            }
          }}
          className="bg-accent text-on-accent hover:bg-accent-hover flex-1 rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
        >
          {opened === null ? 'Save board' : 'Save'}
          {unsaved && <span aria-hidden="true"> •</span>}
        </button>
        {opened !== null && (
          <button
            type="button"
            disabled={!hasBoard}
            onClick={() => {
              setAsking('copy');
            }}
            className="border-line-strong hover:bg-hover flex-1 rounded-lg border px-3 py-1.5 disabled:opacity-50"
          >
            Save as copy
          </button>
        )}
      </div>
      <p aria-live="polite" className="text-muted text-xs">
        {statusText(opened, unsaved, sending)}
      </p>
      {(message ?? error) !== null && (
        <p role="alert" className="text-fail">
          {message ?? error}
        </p>
      )}
      {asking === 'save' && (
        <BoardNameDialog
          title="Save board"
          initialName={defaultName}
          confirmLabel="Save"
          onConfirm={(name) => {
            const problem = onSave(name, false);
            if (problem === null) {
              setAsking(null);
              setMessage(null);
            }
            return problem;
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
      {asking === 'copy' && opened !== null && (
        <BoardNameDialog
          title="Save as a copy"
          initialName={copyName(opened.name)}
          confirmLabel="Save copy"
          onConfirm={(name) => {
            const problem = onSave(name, true);
            if (problem === null) {
              setAsking(null);
              setMessage(null);
            }
            return problem;
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
      {asking === 'rename' && opened !== null && (
        <BoardNameDialog
          title="Rename board"
          initialName={opened.name}
          confirmLabel="Rename"
          onConfirm={(name) => {
            onRename(name);
            setAsking(null);
            return null;
          }}
          onCancel={() => {
            setAsking(null);
          }}
        />
      )}
    </section>
  );
}

function statusText(opened: OpenedBoard | null, unsaved: boolean, sending: boolean): string {
  if (opened === null) {
    return 'Not saved yet. Saved boards are listed under My boards.';
  }
  if (unsaved) {
    return 'Unsaved changes.';
  }
  return sending ? 'Saving…' : 'Saved.';
}
