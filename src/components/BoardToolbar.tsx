import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  ImageIcon,
  MagnetIcon,
  Redo2Icon,
  RotateCcwIcon,
  RulerIcon,
  RotateCwIcon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react';
import { IconButton } from './IconButton';

interface BoardToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  snap: boolean;
  movePairs: boolean;
  showPhotos: boolean;
  showDistances: boolean;
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
  onStep: (step: 1 | -1) => void;
}

const DIVIDER = <span className="bg-line-strong mx-1 h-5 w-px" aria-hidden="true" />;

/** The editing tools that float over the top of the board: history, the selected piece, options. */
export function BoardToolbar({
  canUndo,
  canRedo,
  hasSelection,
  snap,
  movePairs,
  showPhotos,
  showDistances,
  hasPieces,
  onUndo,
  onRedo,
  onTurn,
  onRemove,
  onSnapChange,
  onMovePairsChange,
  onShowPhotosChange,
  onShowDistancesChange,
  onStep,
}: BoardToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Edit the board"
      className="border-line bg-surface/90 shadow-shade flex items-center gap-1 rounded-xl border p-1 shadow-lg backdrop-blur"
    >
      <IconButton icon={Undo2Icon} label="Undo" onClick={onUndo} disabled={!canUndo} />
      <IconButton icon={Redo2Icon} label="Redo" onClick={onRedo} disabled={!canRedo} />
      {DIVIDER}
      <IconButton
        icon={RotateCcwIcon}
        label="Turn left 15 degrees"
        onClick={() => {
          onTurn(-15);
        }}
        disabled={!hasSelection}
      />
      <IconButton
        icon={RotateCwIcon}
        label="Turn right 15 degrees"
        onClick={() => {
          onTurn(15);
        }}
        disabled={!hasSelection}
      />
      <IconButton icon={Trash2Icon} label="Remove" onClick={onRemove} disabled={!hasSelection} />
      {DIVIDER}
      <IconButton
        icon={MagnetIcon}
        label="Snap"
        pressed={snap}
        onClick={() => {
          onSnapChange(!snap);
        }}
      />
      <IconButton
        icon={Columns2Icon}
        label="Move pairs together"
        pressed={movePairs}
        onClick={() => {
          onMovePairsChange(!movePairs);
        }}
      />
      <IconButton
        icon={ImageIcon}
        label="Photos"
        pressed={showPhotos}
        onClick={() => {
          onShowPhotosChange(!showPhotos);
        }}
      />
      {DIVIDER}
      <IconButton
        icon={RulerIcon}
        label="Measure distances"
        pressed={showDistances}
        onClick={() => {
          onShowDistancesChange(!showDistances);
        }}
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
