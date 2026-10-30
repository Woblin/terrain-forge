import { Redo2Icon, Undo2Icon } from 'lucide-react';
import { IconButton } from './IconButton';

interface PhoneBoardButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** Undo and redo as round buttons over the corner of the board. */
export function PhoneBoardButtons({ canUndo, canRedo, onUndo, onRedo }: PhoneBoardButtonsProps) {
  return (
    <div role="toolbar" aria-label="Edit the board" className="flex flex-col gap-2">
      <IconButton icon={Undo2Icon} label="Undo" look="round" onClick={onUndo} disabled={!canUndo} />
      <IconButton icon={Redo2Icon} label="Redo" look="round" onClick={onRedo} disabled={!canRedo} />
    </div>
  );
}
