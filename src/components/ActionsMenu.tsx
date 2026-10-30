import { EllipsisIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface ActionsMenuProps {
  /** Read out for the button, such as "More for Large ruin". */
  label: string;
  /** The menu rows; each one calls `close` once it has done its job. */
  children: (close: () => void) => ReactNode;
}

/** The menu's width in CSS pixels, matching its w-56 class. */
const MENU_WIDTH = 224;
/** Room the menu needs below its button before it opens upwards instead. */
const ROOM_BELOW = 260;
const GAP = 4;
const EDGE = 8;

/** A ⋯ button that opens a short menu of less common actions next to it. */
export function ActionsMenu({ label, children }: ActionsMenuProps) {
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<CSSProperties>({});
  const [open, setOpen] = useState(false);

  function close(): void {
    document.getElementById(menuId)?.hidePopover();
  }

  // The menu is placed once, when it opens, so it closes rather than drift away from its button.
  useEffect(() => {
    if (!open) {
      return;
    }
    function hide(): void {
      document.getElementById(menuId)?.hidePopover();
    }
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, { capture: true });
      window.removeEventListener('resize', hide);
    };
  }, [open, menuId]);

  return (
    <>
      <button
        ref={button}
        type="button"
        popoverTarget={menuId}
        aria-label={label}
        title={label}
        className="text-soft hover:bg-hover hover:text-ink focus-visible:outline-accent-ink grid size-9 shrink-0 place-items-center rounded-lg focus-visible:outline-2 pointer-coarse:size-11"
      >
        <EllipsisIcon className="size-[18px]" aria-hidden="true" />
      </button>
      <div
        id={menuId}
        popover="auto"
        onBeforeToggle={(event) => {
          if (event.newState === 'open' && button.current !== null) {
            setPlace(menuPlace(button.current.getBoundingClientRect()));
          }
        }}
        onToggle={(event) => {
          setOpen(event.newState === 'open');
        }}
        style={place}
        className="parchment frame m-0 w-56 rounded-sm p-2"
      >
        {children(close)}
      </div>
    </>
  );
}

/** Where the menu opens: under the button, lined up with its right edge, or above when low. */
function menuPlace(anchor: DOMRect): CSSProperties {
  const left = Math.max(
    EDGE,
    Math.min(anchor.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - EDGE),
  );
  const below = window.innerHeight - anchor.bottom;
  return below >= ROOM_BELOW || below >= anchor.top
    ? { left, top: anchor.bottom + GAP, right: 'auto', bottom: 'auto' }
    : { left, bottom: window.innerHeight - anchor.top + GAP, right: 'auto', top: 'auto' };
}
