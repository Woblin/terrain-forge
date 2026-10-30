import { ChevronDownIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { findMat, type MatId } from '../domain/mats';
import { matDarknessName } from './matDarknessName';
import { matPicture } from './matPictures';
import { MatPicker } from './MatPicker';

interface MatAccordionProps {
  value: MatId;
  onChange: (mat: MatId) => void;
  darkness: number;
  onDarknessChange: (darkness: number) => void;
}

/** The board's mat as one closed row, which opens to the swatches and the darkness slider. */
export function MatAccordion({ value, onChange, darkness, onDarknessChange }: MatAccordionProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const mat = findMat(value);
  const picture = matPicture(mat, 'small');
  return (
    <section className="space-y-2">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen(!open);
          }}
          className="border-line-strong bg-tint hover:bg-hover focus-visible:outline-accent-ink flex w-full items-center gap-3 rounded-[3px] border p-1.5 pr-3 text-left focus-visible:outline-2"
        >
          <span
            aria-hidden="true"
            style={
              picture === null
                ? undefined
                : { backgroundImage: `url("${picture}")`, backgroundSize: 'cover' }
            }
            className="bg-mat ring-brass size-9 shrink-0 rounded-xs ring-1"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-[17px] leading-tight">Mat</span>
            <span className="text-muted truncate text-sm italic">
              {mat.tileWidth === null ? mat.name : `${mat.name} · ${matDarknessName(darkness)}`}
            </span>
          </span>
          <ChevronDownIcon
            className={`text-muted size-[18px] shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      {open && (
        <div id={id}>
          <MatPicker
            value={value}
            onChange={onChange}
            darkness={darkness}
            onDarknessChange={onDarknessChange}
          />
        </div>
      )}
    </section>
  );
}
