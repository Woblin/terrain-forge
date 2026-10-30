import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  ImageIcon,
  LandPlotIcon,
  MagnetIcon,
  Redo2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  RulerIcon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react';
import { IconButton } from './IconButton';
import { ToolToggle } from './ToolToggle';

interface BoardToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  /** The selected piece's name, or null while nothing is selected. */
  selectionName: string | null;
  snap: boolean;
  movePairs: boolean;
  showPhotos: boolean;
  showDistances: boolean;
  showMat: boolean;
  /** Whether there are pieces to step through while measuring. */
  hasPieces: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTurn: (degrees: number) => void;
  onRemove: () => void;
  onSnapChange: (snap: boolean) => void;
  onMovePairsChange: (movePairs: boolean) => void;
  onShowPhotosChange: (show: boolean) => void;
  onShowDistancesChange: (show: boolean) => void;
  onShowMatChange: (show: boolean) => void;
  onStep: (step: 1 | -1) => void;
}

const DIVIDER = <span className="bg-iron-line mx-1 h-[22px] w-px" aria-hidden="true" />;

const PIECE_BUTTON =
  'flex h-9 items-center gap-1.5 rounded-[3px] px-2 hover:bg-hover focus-visible:outline-2 focus-visible:outline-brass-bright pointer-coarse:h-11';

/** The editing tools above the board: history, the selected piece, and board options. */
export function BoardToolbar({
  canUndo,
  canRedo,
  selectionName,
  snap,
  movePairs,
  showPhotos,
  showDistances,
  showMat,
  hasPieces,
  onUndo,
  onRedo,
  onTurn,
  onRemove,
  onSnapChange,
  onMovePairsChange,
  onShowPhotosChange,
  onShowDistancesChange,
  onShowMatChange,
  onStep,
}: BoardToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Edit the board"
      className="on-leather border-brass bg-iron-raised flex flex-wrap items-center justify-center gap-1 rounded-sm border p-1 text-sm shadow-[inset_0_0_0_1px_#3d2e1c,0_6px_16px_rgb(0_0_0/0.5)]"
    >
      <IconButton icon={Undo2Icon} label="Undo" onClick={onUndo} disabled={!canUndo} />
      <IconButton icon={Redo2Icon} label="Redo" onClick={onRedo} disabled={!canRedo} />
      {DIVIDER}
      {/* The piece tools keep their room while nothing is selected, so the toolbar never jumps. */}
      <div className="flex min-w-[250px] items-center justify-center gap-1">
        {selectionName === null ? (
          <span className="text-on-iron-muted px-2.5 italic">
            Select a piece to turn or remove it
          </span>
        ) : (
          <>
            <span className="font-display text-brass-glow max-w-40 truncate rounded-xs bg-[rgb(201_163_82/0.2)] px-2.5 py-0.5 text-[15px]">
              {selectionName}
            </span>
            <button
              type="button"
              aria-label="Turn left 15 degrees"
              title="Turn left 15 degrees"
              onClick={() => {
                onTurn(-15);
              }}
              className={PIECE_BUTTON}
            >
              <RotateCcwIcon className="size-[17px]" aria-hidden="true" />
              <span aria-hidden="true">15°</span>
            </button>
            <button
              type="button"
              aria-label="Turn right 15 degrees"
              title="Turn right 15 degrees"
              onClick={() => {
                onTurn(15);
              }}
              className={PIECE_BUTTON}
            >
              <RotateCwIcon className="size-[17px]" aria-hidden="true" />
              <span aria-hidden="true">15°</span>
            </button>
            <button type="button" onClick={onRemove} className={`${PIECE_BUTTON} text-fail`}>
              <Trash2Icon className="size-[17px]" aria-hidden="true" />
              Remove
            </button>
          </>
        )}
      </div>
      {DIVIDER}
      <ToolToggle
        icon={MagnetIcon}
        label="Snap"
        title="Snap to the grid"
        pressed={snap}
        onChange={onSnapChange}
      />
      <ToolToggle
        icon={Columns2Icon}
        label="Pairs"
        title="Move pairs together"
        pressed={movePairs}
        onChange={onMovePairsChange}
      />
      <ToolToggle
        icon={ImageIcon}
        label="Photos"
        title="Show piece photos"
        pressed={showPhotos}
        onChange={onShowPhotosChange}
      />
      <ToolToggle
        icon={LandPlotIcon}
        label="Mat"
        title="Show the mat"
        pressed={showMat}
        onChange={onShowMatChange}
      />
      <ToolToggle
        icon={RulerIcon}
        label="Measure"
        title="Measure distances to the board edges"
        pressed={showDistances}
        onChange={onShowDistancesChange}
      />
      {showDistances && (
        <>
          <IconButton
            icon={ChevronLeftIcon}
            label="Previous piece"
            disabled={!hasPieces}
            onClick={() => {
              onStep(-1);
            }}
          />
          <IconButton
            icon={ChevronRightIcon}
            label="Next piece"
            disabled={!hasPieces}
            onClick={() => {
              onStep(1);
            }}
          />
        </>
      )}
    </div>
  );
}
