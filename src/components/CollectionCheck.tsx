import { useMemo } from 'react';
import { checkCollection } from '../domain/collectionCheck';
import { enabledRulesFor, type GamePreferences } from '../domain/gamePreferences';
import type { TerrainPiece } from '../domain/terrain';
import type { LengthUnit } from '../domain/units';
import { CollectionCheckRow } from './CollectionCheckRow';

interface CollectionCheckProps {
  pieces: readonly TerrainPiece[];
  /** Whose rule switches decide what each game needs. */
  preferences: GamePreferences;
  unit: LengthUnit;
}

/** Whether the library is enough for each game system, before the player generates a board. */
export function CollectionCheck({ pieces, preferences, unit }: CollectionCheckProps) {
  const checks = useMemo(
    () => checkCollection(pieces, (preset) => enabledRulesFor(preset, preferences)),
    [pieces, preferences],
  );
  return (
    <section
      aria-labelledby="collection-check-heading"
      className="border-line bg-surface rounded-2xl border p-4 shadow-sm"
    >
      <h2 id="collection-check-heading" className="font-semibold">
        Is your terrain enough?
      </h2>
      <ul className="divide-line divide-y">
        {checks.map((check) => (
          <CollectionCheckRow key={check.preset.id} check={check} unit={unit} />
        ))}
      </ul>
    </section>
  );
}
