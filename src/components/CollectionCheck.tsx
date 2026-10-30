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
    () => checkCollection(pieces, (preset) => enabledRulesFor(preset, preferences), unit),
    [pieces, preferences, unit],
  );
  return (
    <section
      aria-labelledby="collection-check-heading"
      className="parchment frame rounded-sm px-5 pt-[18px] pb-2.5"
    >
      <h2 id="collection-check-heading" className="font-display mb-1 text-[22px]">
        Is your terrain enough?
      </h2>
      <p className="text-muted mb-1.5 text-xs">
        How your collection suits each game. You can play every game marked Ready or Playable; the
        notes say what would make boards better.
      </p>
      <ul>
        {checks.map((check) => (
          <CollectionCheckRow key={check.preset.id} check={check} unit={unit} />
        ))}
      </ul>
    </section>
  );
}
