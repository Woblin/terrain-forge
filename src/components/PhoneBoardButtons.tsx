import { LayersIcon, Redo2Icon, Undo2Icon } from 'lucide-react';
import { useId } from 'react';
import { IconButton } from './IconButton';
import { LayersMenu, type LayerSettings } from './LayersMenu';

interface PhoneBoardButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  layers: LayerSettings;
  onUndo: () => void;
  onRedo: () => void;
  onLayersChange: (change: Partial<LayerSettings>) => void;
}

/** Undo, redo and the board options as round buttons over the corner of the board. */
export function PhoneBoardButtons({
  canUndo,
  canRedo,
  layers,
  onUndo,
  onRedo,
  onLayersChange,
}: PhoneBoardButtonsProps) {
  const menuId = useId();
  return (
    <div role="toolbar" aria-label="Edit the board" className="flex flex-col gap-2">
      <IconButton icon={Undo2Icon} label="Undo" look="round" onClick={onUndo} disabled={!canUndo} />
      <IconButton icon={Redo2Icon} label="Redo" look="round" onClick={onRedo} disabled={!canRedo} />
      <button
        type="button"
        popoverTarget={menuId}
        aria-label="Board options"
        title="Board options"
        className="border-line bg-surface/90 text-soft shadow-shade focus-visible:outline-accent-ink grid size-11 place-items-center rounded-full border shadow-lg backdrop-blur focus-visible:outline-2"
      >
        <LayersIcon className="size-[18px]" aria-hidden="true" />
      </button>
      <div
        id={menuId}
        popover="auto"
        className="border-line bg-surface text-ink shadow-shade top-auto right-3 bottom-24 left-3 m-0 rounded-2xl border p-4 shadow-2xl"
      >
        <LayersMenu settings={layers} onChange={onLayersChange} />
      </div>
    </div>
  );
}
