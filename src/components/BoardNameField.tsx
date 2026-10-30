import { PencilIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { SAVED_BOARD_LIMITS } from '../domain/savedBoard';

interface BoardNameFieldProps {
  name: string;
  /** Called with the new name, already trimmed and never empty. */
  onRename: (name: string) => void;
  /** Size classes for the name: the display font at 22px by default. */
  className?: string;
}

/**
 * The board's name, which turns into a field when clicked. Enter saves, Escape cancels, and
 * an empty name keeps the old one.
 */
export function BoardNameField({ name, onRename, className = 'text-[22px]' }: BoardNameFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  function finish(save: boolean): void {
    const trimmed = draft?.trim() ?? '';
    if (save && trimmed !== '' && trimmed !== name) {
      onRename(trimmed);
    }
    setDraft(null);
  }

  if (draft === null) {
    return (
      <h1 className="m-0 min-w-0">
        <button
          type="button"
          title="Rename board"
          onClick={() => {
            setDraft(name);
          }}
          className={`font-display hover:border-line focus-visible:outline-brass-bright text-heading -mx-1.5 flex max-w-full cursor-text items-center gap-2 rounded-[3px] border border-transparent px-1.5 text-left leading-snug focus-visible:outline-2 ${className}`}
        >
          <span className="truncate">{name}</span>
          <PencilIcon className="text-brass-ink size-[15px] shrink-0" aria-hidden="true" />
          <span className="sr-only">, rename</span>
        </button>
      </h1>
    );
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        finish(true);
      }}
      className="flex min-w-0 items-center gap-1.5"
    >
      <label htmlFor={id} className="sr-only">
        Board name
      </label>
      <input
        id={id}
        // The field replaces the button the player just clicked, so it takes its focus.
        autoFocus
        value={draft}
        maxLength={SAVED_BOARD_LIMITS.nameLength}
        autoComplete="off"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
          }
        }}
        className="font-display border-brass-bright bg-field text-heading h-9 w-[min(420px,60vw)] min-w-0 rounded-[3px] border px-2 text-xl shadow-[0_0_0_3px_rgb(201_163_82/0.2)] outline-none pointer-coarse:h-11"
      />
      <button
        type="submit"
        className="border-brass-bright text-brass-ink hover:bg-brass-bright/30 focus-visible:outline-brass-bright h-9 shrink-0 rounded-[3px] border bg-[rgb(201_163_82/0.2)] px-3 font-semibold focus-visible:outline-2 pointer-coarse:h-11"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => {
          finish(false);
        }}
        className="text-muted hover:text-ink h-9 shrink-0 px-2 underline underline-offset-2 pointer-coarse:h-11"
      >
        Cancel
      </button>
    </form>
  );
}
