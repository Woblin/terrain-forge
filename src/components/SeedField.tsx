import { useId, useState, type SubmitEvent } from 'react';
import { codeToSeed } from '../domain/random';

interface SeedFieldProps {
  /** The current board's code, or null before the first board. */
  seedCode: string | null;
  edited: boolean;
  onLoadSeed: (seed: number) => void;
  onRandomSeed: () => void;
  onCopyLink: () => Promise<void>;
}

/** The current board's code, a field to load a board by code, and copying a share link. */
export function SeedField({
  seedCode,
  edited,
  onLoadSeed,
  onRandomSeed,
  onCopyLink,
}: SeedFieldProps) {
  const inputId = useId();
  const [shownCode, setShownCode] = useState(seedCode);
  const [draft, setDraft] = useState(seedCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  if (shownCode !== seedCode) {
    setShownCode(seedCode);
    setDraft(seedCode ?? '');
    setError(null);
    setCopyMessage(null);
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const seed = codeToSeed(draft);
    if (seed === null) {
      setError('Not a valid board code. Codes are up to 7 letters and digits.');
      return;
    }
    setError(null);
    onLoadSeed(seed);
  }

  async function copy(): Promise<void> {
    try {
      await onCopyLink();
      setCopyMessage(
        edited ? 'Link copied. It opens the generated board, without your edits.' : 'Link copied.',
      );
    } catch (caught) {
      setCopyMessage(caught instanceof Error ? caught.message : 'Could not copy the link.');
    }
  }

  return (
    <section className="space-y-3 rounded-lg bg-stone-800 p-4">
      <form onSubmit={submit} className="space-y-1">
        <label htmlFor={inputId} className="block text-sm text-stone-300">
          Board code
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value.toUpperCase());
            }}
            maxLength={7}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : `${inputId}-error`}
            className="w-full min-w-0 rounded border border-stone-600 bg-stone-900 px-2 py-1.5 font-mono tracking-widest uppercase"
          />
          <button type="submit" className="rounded border border-stone-500 px-3 hover:bg-stone-700">
            Load
          </button>
          <button
            type="button"
            onClick={onRandomSeed}
            aria-label="New random board"
            title="New random board"
            className="rounded border border-stone-500 px-3 hover:bg-stone-700"
          >
            🎲
          </button>
        </div>
        {error !== null && (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
      </form>
      <button
        type="button"
        disabled={seedCode === null}
        onClick={() => void copy()}
        className="w-full rounded border border-stone-500 px-3 py-1.5 hover:bg-stone-700 disabled:opacity-50"
      >
        Copy link
      </button>
      <p aria-live="polite" className="text-sm text-stone-300">
        {copyMessage}
      </p>
    </section>
  );
}
