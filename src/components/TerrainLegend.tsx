import { TERRAIN_TYPES, type TerrainEffects } from '../domain/terrain';
import { TERRAIN_STYLES } from './terrainStyles';

interface TerrainLegendProps {
  effects: TerrainEffects;
}

const SIGHT = { blocks: 'blocks sight', obscures: 'obscures sight', none: 'open sight' } as const;
const COVER = { heavy: 'heavy cover', light: 'light cover', none: 'no cover' } as const;

/** What each terrain type looks like on the board and what it does in this game system. */
export function TerrainLegend({ effects }: TerrainLegendProps) {
  return (
    <ul className="text-soft flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
      {TERRAIN_TYPES.map((type) => {
        const style = TERRAIN_STYLES[type];
        return (
          <li key={type} className="flex items-center gap-1.5">
            <svg viewBox="0 0 18 12" className="h-3 w-[18px]" aria-hidden="true">
              <rect
                x={1}
                y={1}
                width={16}
                height={10}
                className={`${style.fill} ${style.stroke}`}
                strokeWidth={1.5}
                strokeDasharray={style.dash}
              />
            </svg>
            <span>
              <span className="text-ink font-semibold">{style.name}</span>:{' '}
              {SIGHT[effects[type].los]}, {COVER[effects[type].cover]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
