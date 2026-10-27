import { useMemo } from 'react';
import { checkCollection } from '../domain/collectionCheck';
import type { TerrainPiece } from '../domain/terrain';
import type { LengthUnit } from '../domain/units';
import { CollectionCheckRow } from './CollectionCheckRow';

interface CollectionCheckProps {
  pieces: readonly TerrainPiece[];
  unit: LengthUnit;
}

/** Whether the library is enough for each game system, before the player generates a board. */
export function CollectionCheck({ pieces, unit }: CollectionCheckProps) {
  const checks = useMemo(() => checkCollection(pieces), [pieces]);
  return (
    <section aria-labelledby="collection-check-heading" className="rounded-lg bg-stone-800 p-4">
      <h2
        id="collection-check-heading"
        className="text-sm font-semibold tracking-wide text-stone-400 uppercase"
      >
        Is your terrain enough?
      </h2>
      <ul className="divide-y divide-stone-700">
        {checks.map((check) => (
          <CollectionCheckRow key={check.preset.id} check={check} unit={unit} />
        ))}
      </ul>
    </section>
  );
}
