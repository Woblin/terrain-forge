import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

interface SidePanelProps {
  side: 'left' | 'right';
  title: string;
  /** Shown on the narrow rail while the panel is closed. */
  icon: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True to slide over the board when open, instead of taking room next to it. */
  overlay: boolean;
  /** Width classes for the open panel. */
  widthClassName: string;
  children: ReactNode;
}

/** A panel beside the board that folds down to a narrow rail. */
export function SidePanel({
  side,
  title,
  icon,
  open,
  onOpenChange,
  overlay,
  widthClassName,
  children,
}: SidePanelProps) {
  const left = side === 'left';
  const panel = (
    <section
      aria-label={title}
      className={`border-line bg-surface flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm ${overlay ? `shadow-shade absolute inset-y-0 z-20 shadow-2xl ${left ? 'left-0' : 'right-0'}` : ''} ${widthClassName}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3">
        <h2 className="font-semibold">{title}</h2>
        <IconButton
          icon={left ? PanelLeftCloseIcon : PanelRightCloseIcon}
          label={`Hide ${title.toLowerCase()}`}
          onClick={() => {
            onOpenChange(false);
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">{children}</div>
    </section>
  );
  const rail = (
    <div className="border-line bg-surface flex h-full w-14 shrink-0 flex-col items-center gap-2 rounded-2xl border py-3 shadow-sm">
      <IconButton
        icon={left ? PanelLeftOpenIcon : PanelRightOpenIcon}
        label={`Show ${title.toLowerCase()}`}
        onClick={() => {
          onOpenChange(true);
        }}
      />
      <IconButton
        icon={icon}
        label={title}
        onClick={() => {
          onOpenChange(true);
        }}
      />
    </div>
  );
  if (!overlay) {
    return open ? panel : rail;
  }
  return (
    <div className="relative h-full">
      {rail}
      {open && panel}
    </div>
  );
}
