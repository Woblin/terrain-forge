import { useId, useState, type SubmitEvent } from 'react';
import { codeToSeed } from '../domain/random';
import { BUTTON_STYLES } from './buttonStyles';
import { FIELD_STYLES } from './fieldStyles';

interface LoadCodeFormProps {
  id: string;
  onLoadSeed: (seed: number) => void;
  onClose: () => void;
}

/** A row to type another board's code and load that board. */
export function LoadCodeForm({ id, onLoadSeed, onClose }: LoadCodeFormProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const seed = codeToSeed(draft);
    if (seed === null) {
      setError('Not a valid board code. Codes are up to 7 letters and digits.');
      return;
    }
    setError(null);
    onLoadSeed(seed);
    onClose();
  }

  return (
    <form
      id={id}
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      className="parchment border-brass shrink-0 rounded-sm border px-3 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-muted font-semibold">
          Board code
        </label>
        <span className="w-48">
          <input
            id={inputId}
            // Opened by the player to type a code, so it takes the focus.
            autoFocus
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value.toUpperCase());
            }}
            maxLength={7}
            placeholder="7 letters or digits"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : `${inputId}-error`}
            className={`${FIELD_STYLES} font-mono tracking-[0.12em] uppercase placeholder:tracking-normal placeholder:normal-case`}
          />
        </span>
        <button type="submit" className={`${BUTTON_STYLES.secondary} h-10 pointer-coarse:h-11`}>
          Load board
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-ink h-10 px-2 underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
      {error !== null && (
        <p id={`${inputId}-error`} role="alert" className="text-fail mt-1.5 text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
