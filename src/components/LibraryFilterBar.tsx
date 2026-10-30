import { SearchIcon } from 'lucide-react';
import { useId } from 'react';
import type { LibraryFilter } from '../domain/library';
import type { TerrainType } from '../domain/terrain';
import { TERRAIN_STYLES } from './terrainStyles';

interface LibraryFilterBarProps {
  filter: LibraryFilter;
  /** The types to offer, those the library has pieces of. */
  types: readonly TerrainType[];
  onChange: (filter: LibraryFilter) => void;
}

const CHIP =
  'inline-flex h-[34px] shrink-0 items-center gap-[7px] rounded-full border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent-ink pointer-coarse:h-11';

/** A search box and one chip per terrain type, to find pieces in a large library. */
export function LibraryFilterBar({ filter, types, onChange }: LibraryFilterBarProps) {
  const searchId = useId();
  const chips: readonly (TerrainType | null)[] = [null, ...types];
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="parchment relative rounded-[3px] md:w-[300px]">
        <label htmlFor={searchId} className="sr-only">
          Search your terrain
        </label>
        <SearchIcon
          className="text-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          id={searchId}
          type="search"
          value={filter.search}
          placeholder="Search by name"
          autoComplete="off"
          onChange={(event) => {
            onChange({ ...filter, search: event.target.value });
          }}
          className="border-brass bg-field focus-visible:outline-accent-ink placeholder:text-faint h-10 w-full rounded-[3px] border pr-3 pl-9 text-sm shadow-[inset_0_1px_2px_rgb(42_29_18/0.12)] focus-visible:outline-2 pointer-coarse:h-11"
        />
      </div>
      <div
        role="group"
        aria-label="Show one type"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0 md:pb-0"
      >
        {chips.map((type) => {
          const on = filter.type === type;
          return (
            <button
              key={type ?? 'all'}
              type="button"
              aria-pressed={on}
              onClick={() => {
                onChange({ ...filter, type });
              }}
              className={`${CHIP} ${on ? 'bg-accent text-on-accent border-seal-dark' : 'border-brass bg-iron text-on-iron-muted hover:text-on-iron'}`}
            >
              {type !== null && (
                <span
                  className={`size-2.5 rounded-sm ${TERRAIN_STYLES[type].swatch}`}
                  aria-hidden="true"
                />
              )}
              {type === null ? 'All' : TERRAIN_STYLES[type].name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
