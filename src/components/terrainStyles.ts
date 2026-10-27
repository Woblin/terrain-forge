import { TERRAIN_TYPE_NAMES, type TerrainType } from '../domain/terrain';

export interface TerrainStyle {
  readonly name: string;
  readonly fill: string;
  readonly stroke: string;
  /** Outline pattern in screen pixels, so types can be told apart without colour. */
  readonly dash: string | undefined;
}

export const TERRAIN_STYLES: Readonly<Record<TerrainType, TerrainStyle>> = {
  ruin: {
    name: TERRAIN_TYPE_NAMES.ruin,
    fill: 'fill-stone-500',
    stroke: 'stroke-stone-100',
    dash: undefined,
  },
  building: {
    name: TERRAIN_TYPE_NAMES.building,
    fill: 'fill-slate-600',
    stroke: 'stroke-sky-200',
    dash: '6 2',
  },
  forest: {
    name: TERRAIN_TYPE_NAMES.forest,
    fill: 'fill-green-700',
    stroke: 'stroke-green-200',
    dash: '2 2',
  },
  obstacle: {
    name: TERRAIN_TYPE_NAMES.obstacle,
    fill: 'fill-amber-700',
    stroke: 'stroke-amber-200',
    dash: undefined,
  },
  hill: {
    name: TERRAIN_TYPE_NAMES.hill,
    fill: 'fill-lime-800',
    stroke: 'stroke-lime-300',
    dash: '8 3 2 3',
  },
  crater: {
    name: TERRAIN_TYPE_NAMES.crater,
    fill: 'fill-yellow-900',
    stroke: 'stroke-yellow-300',
    dash: '3 3',
  },
};

/** The two players' colours, for zones and overlays. */
export const PLAYER_STYLES = {
  A: {
    zone: 'fill-red-500/15',
    hatch: 'stroke-red-400/40',
    text: 'fill-red-200',
    hidden: 'fill-red-300/35',
  },
  B: {
    zone: 'fill-sky-500/15',
    hatch: 'stroke-sky-400/40',
    text: 'fill-sky-200',
    hidden: 'fill-sky-300/35',
  },
} as const;
