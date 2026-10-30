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
  matDarkness: number;
  hasMatPicture: boolean;
  onMatDarknessChange: (darkness: number) => void;
}

/** Undo, redo and the board options as round buttons over the corner of the board. */
export function PhoneBoardButtons({
  canUndo,
  canRedo,
  layers,
  onUndo,
  onRedo,
  onLayersChange,
  matDarkness,
  hasMatPicture,
  onMatDarknessChange,
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
        className="border-brass bg-iron/90 text-on-iron shadow-shade focus-visible:outline-brass-bright grid size-11 place-items-center rounded-full border shadow-lg focus-visible:outline-2"
      >
        <LayersIcon className="size-[18px]" aria-hidden="true" />
      </button>
      <div
        id={menuId}
        popover="auto"
        className="parchment frame top-auto right-3 bottom-24 left-3 m-0 rounded-sm p-5"
      >
        <LayersMenu
          settings={layers}
          onChange={onLayersChange}
          matDarkness={matDarkness}
          hasMatPicture={hasMatPicture}
          onMatDarknessChange={onMatDarknessChange}
        />
      </div>
    </div>
  );
}
