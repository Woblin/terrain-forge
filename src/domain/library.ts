import { footprintRatio } from './imageCrop';
import { SAMPLE_COLLECTION } from './sampleCollection';
import { TERRAIN_TYPES, type Footprint, type TerrainPiece, type TerrainType } from './terrain';
import { formatLength, fromInches, toInches, type LengthUnit } from './units';

/** Which saved photo a piece shows, and the footprint ratio it was cropped to. */
export interface PieceImage {
  readonly version: number;
  readonly ratio: number;
}

/** A piece in a player's terrain library. */
export interface LibraryPiece extends TerrainPiece {
  readonly image: PieceImage | null;
}

export const LIBRARY_LIMITS = {
  nameLength: 40,
  /** Shortest and longest side of a footprint, in inches. */
  minSide: 0.5,
  maxSide: 36,
  minQuantity: 1,
  maxQuantity: 20,
  /** Different pieces in one library. */
  maxKinds: 50,
  /** Physical pieces in one library, counting every copy. */
  maxPieces: 100,
} as const;

export type FootprintKind = Footprint['kind'];

/** What the player typed into the piece form. Lengths are in the player's unit. */
export interface PieceDraft {
  readonly name: string;
  readonly type: TerrainType;
  readonly shape: FootprintKind;
  readonly width: string;
  readonly depth: string;
  readonly quantity: string;
}

export type DraftField = 'name' | 'width' | 'depth' | 'quantity';

/** Problems with a draft, one message per field, plus any limit on the library as a whole. */
export type DraftErrors = Readonly<Partial<Record<DraftField | 'library', string>>>;

export type PieceFields = Omit<TerrainPiece, 'id'>;

export type DraftResult =
  | { readonly ok: true; readonly fields: PieceFields }
  | { readonly ok: false; readonly errors: DraftErrors };

/** Photos whose ratio is further than this share from the footprint's need cropping again. */
const RECROP_TOLERANCE = 0.02;

export const EMPTY_DRAFT: PieceDraft = {
  name: '',
  type: 'ruin',
  shape: 'rect',
  width: '',
  depth: '',
  quantity: '1',
};

/**
 * Checks a draft against the library it goes into. `editing` is the piece being changed, or
 * null for a new piece. Sizes the player left as they were keep their exact value, so editing in
 * centimetres does not round a piece's other side.
 */
export function validatePieceDraft(
  draft: PieceDraft,
  unit: LengthUnit,
  library: readonly LibraryPiece[],
  editing: TerrainPiece | null,
): DraftResult {
  const name = draft.name.trim();
  const width = keptLength(draft.width, editing?.footprint.width, unit);
  const depth = keptLength(draft.depth, editing?.footprint.depth, unit);
  const quantity = parseNumber(draft.quantity);
  const editingId = editing?.id ?? null;
  const others = library.filter((piece) => piece.id !== editingId);
  const errors: Partial<Record<DraftField | 'library', string>> = {
    name: nameError(name),
    width: sideError('Width', width, unit),
    depth: sideError('Depth', depth, unit),
    quantity: quantityError(quantity, roomFor(others)),
    library: editingId === null ? kindsError(library) : undefined,
  };
  const found = Object.fromEntries(
    Object.entries(errors).filter((entry) => typeof entry[1] === 'string'),
  );
  if (Object.keys(found).length > 0 || width === null || depth === null || quantity === null) {
    return { ok: false, errors: found };
  }
  return {
    ok: true,
    fields: {
      name,
      type: draft.type,
      footprint: { kind: draft.shape, width, depth },
      quantity,
    },
  };
}

/** The footprint a draft describes, in inches, or null while its sizes are not valid yet. */
export function draftFootprint(draft: PieceDraft, unit: LengthUnit): Footprint | null {
  const width = parseLength(draft.width, unit);
  const depth = parseLength(draft.depth, unit);
  if (
    sideError('Width', width, unit) !== undefined ||
    sideError('Depth', depth, unit) !== undefined ||
    width === null ||
    depth === null
  ) {
    return null;
  }
  return { kind: draft.shape, width, depth };
}

/** The form's starting values for an existing piece, in the player's unit. */
export function draftFromPiece(piece: TerrainPiece, unit: LengthUnit): PieceDraft {
  return {
    name: piece.name,
    type: piece.type,
    shape: piece.footprint.kind,
    width: lengthText(piece.footprint.width, unit),
    depth: lengthText(piece.footprint.depth, unit),
    quantity: String(piece.quantity),
  };
}

/** A draft for a copy of a piece, with a name that says it is a copy. */
export function copyDraft(piece: TerrainPiece, unit: LengthUnit): PieceDraft {
  const suffix = ' (copy)';
  const name = `${piece.name.slice(0, LIBRARY_LIMITS.nameLength - suffix.length)}${suffix}`;
  return { ...draftFromPiece(piece, unit), name };
}

/** Lengths are kept to a hundredth of an inch, finer than anyone measures terrain. */
export function roundInches(inches: number): number {
  return Math.round(inches * 100) / 100;
}

/** How many more physical pieces fit in the library. */
export function roomFor(library: readonly TerrainPiece[]): number {
  return Math.max(0, LIBRARY_LIMITS.maxPieces - countPieces(library));
}

export function countPieces(library: readonly TerrainPiece[]): number {
  return library.reduce((sum, piece) => sum + piece.quantity, 0);
}

/** Whether a quantity is allowed for a piece already in the library. */
export function canSetQuantity(
  library: readonly LibraryPiece[],
  piece: LibraryPiece,
  quantity: number,
): boolean {
  const others = library.filter((other) => other.id !== piece.id);
  return quantityError(quantity, roomFor(others)) === undefined;
}

/** True when the piece's photo was cropped for a different footprint shape. */
export function needsRecrop(piece: LibraryPiece): boolean {
  if (piece.image === null) {
    return false;
  }
  const ratio = footprintRatio(piece.footprint);
  return Math.abs(piece.image.ratio - ratio) > RECROP_TOLERANCE * ratio;
}

/** The piece with a newly cropped photo for its current footprint. */
export function withPhoto(piece: LibraryPiece): LibraryPiece {
  return {
    ...piece,
    image: { version: (piece.image?.version ?? 0) + 1, ratio: footprintRatio(piece.footprint) },
  };
}

export function withoutPhoto(piece: LibraryPiece): LibraryPiece {
  return { ...piece, image: null };
}

/** The built-in sample set as library pieces, each with a fresh id. */
export function sampleLibrary(newId: () => string): LibraryPiece[] {
  return SAMPLE_COLLECTION.map((piece) => ({ ...piece, id: newId(), image: null }));
}

export interface PieceGroup {
  readonly type: TerrainType;
  readonly pieces: readonly LibraryPiece[];
}

/** The library grouped by terrain type, in the usual type order, names A to Z in each group. */
export function groupByType(library: readonly LibraryPiece[]): PieceGroup[] {
  return TERRAIN_TYPES.map((type) => ({
    type,
    pieces: library
      .filter((piece) => piece.type === type)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.pieces.length > 0);
}

function keptLength(text: string, original: number | undefined, unit: LengthUnit): number | null {
  return original !== undefined && text.trim() === lengthText(original, unit)
    ? original
    : parseLength(text, unit);
}

function parseLength(text: string, unit: LengthUnit): number | null {
  const value = parseNumber(text);
  return value === null ? null : roundInches(toInches(value, unit));
}

/** Accepts a decimal comma as well as a decimal point. */
function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function lengthText(inches: number, unit: LengthUnit): string {
  const decimals = unit === 'in' ? 2 : 1;
  return String(Number(fromInches(inches, unit).toFixed(decimals)));
}

function nameError(name: string): string | undefined {
  if (name === '') {
    return 'Give the piece a name.';
  }
  if (name.length > LIBRARY_LIMITS.nameLength) {
    return `Keep the name to ${String(LIBRARY_LIMITS.nameLength)} characters or fewer.`;
  }
  return undefined;
}

function sideError(label: string, inches: number | null, unit: LengthUnit): string | undefined {
  const { minSide, maxSide } = LIBRARY_LIMITS;
  if (inches !== null && inches >= minSide && inches <= maxSide) {
    return undefined;
  }
  return `${label} must be between ${formatLength(minSide, unit)} and ${formatLength(maxSide, unit)}.`;
}

function quantityError(quantity: number | null, room: number): string | undefined {
  const { minQuantity, maxQuantity, maxPieces } = LIBRARY_LIMITS;
  if (quantity === null || !Number.isInteger(quantity)) {
    return 'Enter how many you own as a whole number.';
  }
  if (quantity < minQuantity || quantity > maxQuantity) {
    return `You can have ${String(minQuantity)} to ${String(maxQuantity)} of one piece.`;
  }
  if (quantity > room) {
    return `Your library holds ${String(maxPieces)} pieces in all; there is room for ${String(room)} more.`;
  }
  return undefined;
}

function kindsError(library: readonly LibraryPiece[]): string | undefined {
  return library.length >= LIBRARY_LIMITS.maxKinds
    ? `Your library holds at most ${String(LIBRARY_LIMITS.maxKinds)} different pieces. Raise the count of a piece you have, or delete one first.`
    : undefined;
}

/** What the player narrows the library down to: words in the name, and one terrain type or all. */
export interface LibraryFilter {
  readonly search: string;
  readonly type: TerrainType | null;
}

export const NO_FILTER: LibraryFilter = { search: '', type: null };

/**
 * The pieces that match the filter, in type order and then by name. Every word of the search must
 * appear in the piece's name, in any case and order.
 */
export function filterLibrary(
  library: readonly LibraryPiece[],
  filter: LibraryFilter,
): LibraryPiece[] {
  const words = filter.search.toLowerCase().split(/\s+/).filter(Boolean);
  return groupByType(library)
    .flatMap((group) => group.pieces)
    .filter(
      (piece) =>
        (filter.type === null || piece.type === filter.type) &&
        words.every((word) => piece.name.toLowerCase().includes(word)),
    );
}

/** The terrain types the library has pieces of, in type order. */
export function typesInLibrary(library: readonly LibraryPiece[]): TerrainType[] {
  return TERRAIN_TYPES.filter((type) => library.some((piece) => piece.type === type));
}
