import { ArrowRightToLineIcon, LinkIcon } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { BoardNameField } from './BoardNameField';
import { BUTTON_STYLES } from './buttonStyles';
import { LoadCodeForm } from './LoadCodeForm';

/** Where the board stands against the copy saved in the account. */
export type BoardSaveState = 'notSaved' | 'unsaved' | 'saving' | 'saved';

interface BoardHeaderBarProps {
  name: string;
  onRename: (name: string) => void;
  saveState: BoardSaveState;
  /** The board's code, or null before the first board. */
  code: string | null;
  /** True when the board was changed by hand, which a share link leaves out. */
  edited: boolean;
  onLoadSeed: (seed: number) => void;
  onCopyLink: () => Promise<void>;
  /** Save board, or a way to sign in to save. */
  saveControls: ReactNode;
  /**
   * True in the phone's Setup tab: the name and status above a row of equal buttons, with
   * Save first.
   */
  compact?: boolean;
}

const BUTTON = `${BUTTON_STYLES.secondary} h-[38px] px-3 pointer-coarse:h-11`;

const STATES: Readonly<Record<BoardSaveState, { label: string; dot: string }>> = {
  notSaved: { label: 'Not saved', dot: 'bg-[#e0a13a]' },
  unsaved: { label: 'Unsaved changes', dot: 'bg-[#e0a13a]' },
  saving: { label: 'Saving…', dot: 'bg-on-iron-muted' },
  saved: { label: 'Saved', dot: 'bg-pass' },
};

/** The board's name and code above the board, with loading, sharing and saving. */
export function BoardHeaderBar({
  name,
  onRename,
  saveState,
  code,
  edited,
  onLoadSeed,
  onCopyLink,
  saveControls,
  compact = false,
}: BoardHeaderBarProps) {
  const loadId = useId();
  const [loading, setLoading] = useState(false);
  const [shareLabel, setShareLabel] = useState<string | null>(null);
  const state = STATES[saveState];

  async function share(): Promise<void> {
    try {
      await onCopyLink();
      setShareLabel(edited ? 'Link copied, without your edits' : 'Link copied');
    } catch (caught) {
      setShareLabel(caught instanceof Error ? caught.message : 'Could not copy the link');
    }
    window.setTimeout(() => {
      setShareLabel(null);
    }, 2500);
  }

  const loadButton = (
    <button
      type="button"
      aria-expanded={loading}
      aria-controls={loadId}
      onClick={() => {
        setLoading(!loading);
      }}
      className={BUTTON}
    >
      {!compact && <ArrowRightToLineIcon className="size-4" aria-hidden="true" />}
      Load code
    </button>
  );
  const shareButton = (
    <button type="button" disabled={code === null} onClick={() => void share()} className={BUTTON}>
      {!compact && <LinkIcon className="size-4" aria-hidden="true" />}
      <span aria-live="polite">{shareLabel ?? 'Share'}</span>
    </button>
  );

  return (
    <div className={`flex shrink-0 flex-col ${compact ? 'gap-3.5' : 'gap-2.5'}`}>
      <div
        className={
          compact
            ? 'flex flex-col gap-3.5'
            : 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-1'
        }
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <BoardNameField
            name={name}
            onRename={onRename}
            className={compact ? 'text-xl' : undefined}
          />
          <p className="text-muted flex items-center gap-2.5 text-sm">
            <span aria-live="polite" className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-[7px] rounded-full ${state.dot}`} />
              {state.label}
            </span>
            {code !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Code <span className="text-ink font-mono tracking-[0.1em]">{code}</span>
                </span>
              </>
            )}
          </p>
        </div>
        {compact ? (
          <div className="flex flex-wrap gap-2 [&>a]:grow [&>a]:whitespace-nowrap [&>button]:grow [&>button]:whitespace-nowrap">
            {saveControls}
            {shareButton}
            {loadButton}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {loadButton}
            {shareButton}
            {saveControls}
          </div>
        )}
      </div>
      {loading && (
        <LoadCodeForm
          id={loadId}
          onLoadSeed={onLoadSeed}
          onClose={() => {
            setLoading(false);
          }}
        />
      )}
    </div>
  );
}
