import { useEffect, useRef, type ReactNode } from 'react';

interface SideSheetProps {
  /** Names the sheet for screen readers. */
  label: string;
  /** While true, Escape does not close the sheet, so a save in progress is not cut off. */
  busy: boolean;
  onCancel: () => void;
  children: ReactNode;
}

/**
 * A panel that slides in from the right over the page, with the page dimmed behind it; on a
 * phone it fills the screen. It is a modal dialog, so focus stays inside until it closes.
 */
export function SideSheet({ label, busy, onCancel, children }: SideSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onCancel();
        }
      }}
      className="bg-surface text-ink shadow-shade md:border-line m-0 h-dvh max-h-none w-full max-w-none p-0 pt-[env(safe-area-inset-top)] shadow-2xl transition duration-200 backdrop:bg-black/40 motion-reduce:transition-none md:ml-auto md:w-[420px] md:border-l starting:open:translate-x-8 starting:open:opacity-0"
    >
      {children}
    </dialog>
  );
}
