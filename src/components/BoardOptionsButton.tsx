import { LayersIcon } from 'lucide-react';
import { useId } from 'react';
import { LayersMenu, type LayerSettings } from './LayersMenu';

interface BoardOptionsButtonProps {
  layers: LayerSettings;
  onLayersChange: (change: Partial<LayerSettings>) => void;
  matDarkness: number;
  hasMatPicture: boolean;
  onMatDarknessChange: (darkness: number) => void;
  /** 'bar' sits in the iron top bar; 'round' floats beside the board. */
  look: 'bar' | 'round';
}

const LOOKS = {
  bar: 'text-on-iron hover:bg-hover size-11 rounded-sm',
  round: 'border-brass bg-iron/90 text-on-iron shadow-shade size-11 rounded-full border shadow-lg',
} as const;

/** Opens what the board shows and how pieces move, on screens without room for a toolbar. */
export function BoardOptionsButton({
  layers,
  onLayersChange,
  matDarkness,
  hasMatPicture,
  onMatDarknessChange,
  look,
}: BoardOptionsButtonProps) {
  const menuId = useId();
  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        aria-label="Board options"
        title="Board options"
        className={`focus-visible:outline-brass-bright grid shrink-0 place-items-center focus-visible:outline-2 ${LOOKS[look]}`}
      >
        <LayersIcon className="size-[20px]" aria-hidden="true" />
      </button>
      <div
        id={menuId}
        popover="auto"
        className={`parchment frame right-3 left-auto m-0 w-[min(22rem,calc(100vw-1.5rem))] rounded-sm p-5 text-left ${look === 'bar' ? 'top-[calc(3.5rem+env(safe-area-inset-top))] bottom-auto' : 'top-auto bottom-24'}`}
      >
        <LayersMenu
          settings={layers}
          onChange={onLayersChange}
          matDarkness={matDarkness}
          hasMatPicture={hasMatPicture}
          onMatDarknessChange={onMatDarknessChange}
        />
      </div>
    </>
  );
}
