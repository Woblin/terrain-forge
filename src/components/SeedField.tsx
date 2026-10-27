import { useId, useState, type SubmitEvent } from 'react';
import { DicesIcon, LinkIcon } from 'lucide-react';
import { codeToSeed } from '../domain/random';
import { BUTTON_STYLES } from './buttonStyles';
import { FIELD_STYLES, LABEL_STYLES } from './fieldStyles';
import { IconButton } from './IconButton';

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
    <section className="space-y-3">
      <form onSubmit={submit}>
        <label htmlFor={inputId} className={LABEL_STYLES}>
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
            className={`${FIELD_STYLES} min-w-0 font-mono tracking-widest uppercase`}
          />
          <button
            type="submit"
            className={`${BUTTON_STYLES.secondary} h-10 px-3 text-sm pointer-coarse:h-11`}
          >
            Load
          </button>
          <IconButton icon={DicesIcon} label="New random board" onClick={onRandomSeed} />
        </div>
        {error !== null && (
          <p id={`${inputId}-error`} role="alert" className="text-fail mt-1 text-sm">
            {error}
          </p>
        )}
      </form>
      <button
        type="button"
        disabled={seedCode === null}
        onClick={() => void copy()}
        className={`w-full ${BUTTON_STYLES.secondary} h-10 text-sm pointer-coarse:h-11`}
      >
        <LinkIcon className="size-4" aria-hidden="true" />
        Copy share link
      </button>
      <p aria-live="polite" className="text-soft text-sm">
        {copyMessage}
      </p>
    </section>
  );
}
