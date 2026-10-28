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
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent-ink pointer-coarse:h-10';

/** A search box and one chip per terrain type, to find pieces in a large library. */
export function LibraryFilterBar({ filter, types, onChange }: LibraryFilterBarProps) {
  const searchId = useId();
  const chips: readonly (TerrainType | null)[] = [null, ...types];
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative md:w-72">
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
          className="border-line-strong bg-raised focus-visible:outline-accent-ink h-10 w-full rounded-lg border pr-3 pl-9 text-sm focus-visible:outline-2 pointer-coarse:h-11"
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
              className={`${CHIP} ${on ? 'bg-accent text-on-accent border-transparent font-medium' : 'border-line-strong text-soft hover:bg-hover'}`}
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
