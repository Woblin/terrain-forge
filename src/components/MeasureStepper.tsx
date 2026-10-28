import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { IconButton } from './IconButton';

interface MeasureStepperProps {
  /** The selected piece's name and place in the order, or null while nothing is selected. */
  current: { name: string; position: number } | null;
  total: number;
  onStep: (step: 1 | -1) => void;
}

/** Previous and Next piece, for setting the board out on the table one piece at a time. */
export function MeasureStepper({ current, total, onStep }: MeasureStepperProps) {
  return (
    <div
      role="toolbar"
      aria-label="Measure piece by piece"
      className="border-line bg-surface/95 shadow-shade flex items-center gap-1 rounded-2xl border p-1.5 shadow-2xl backdrop-blur"
    >
      <IconButton
        icon={ChevronLeftIcon}
        label="Previous piece"
        disabled={total === 0}
        onClick={() => {
          onStep(-1);
        }}
      />
      <p className="min-w-0 flex-1 truncate text-center text-sm" aria-live="polite">
        {current === null ? (
          <span className="text-muted">Tap a piece, or press Next</span>
        ) : (
          <>
            <span className="font-semibold">{current.name}</span>
            <span className="text-muted tabular-nums">
              {' '}
              · {current.position} of {total}
            </span>
          </>
        )}
      </p>
      <IconButton
        icon={ChevronRightIcon}
        label="Next piece"
        disabled={total === 0}
        onClick={() => {
          onStep(1);
        }}
      />
    </div>
  );
}
