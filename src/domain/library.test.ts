import { describe, expect, it } from 'vitest';
import {
  canSetQuantity,
  copyDraft,
  countPieces,
  draftFootprint,
  draftFromPiece,
  EMPTY_DRAFT,
  filterLibrary,
  groupByType,
  LIBRARY_LIMITS,
  needsRecrop,
  newLibraryPiece,
  NO_FILTER,
  photoFits,
  sampleLibrary,
  typesInLibrary,
  validatePieceDraft,
  withoutPhoto,
  withPhoto,
  type LibraryPiece,
  type PieceDraft,
} from './library';
import { SAMPLE_COLLECTION } from './sampleCollection';

const ruin: LibraryPiece = {
  id: 'a',
  name: 'Large ruin',
  type: 'ruin',
  footprint: { kind: 'rect', width: 12, depth: 6 },
  quantity: 4,
  image: null,
};

const draft: PieceDraft = {
  name: '  Forest  ',
  type: 'forest',
  shape: 'ellipse',
  width: '9',
  depth: '7',
  quantity: '2',
};

function numbered(count: number): LibraryPiece[] {
  return Array.from({ length: count }, (_, i) => ({ ...ruin, id: `p${String(i)}`, quantity: 1 }));
}

describe('validatePieceDraft', () => {
  it('turns a valid draft into piece fields in inches, with a trimmed name', () => {
    expect(validatePieceDraft(draft, 'in', [ruin], null)).toEqual({
      ok: true,
      fields: {
        name: 'Forest',
        type: 'forest',
        footprint: { kind: 'ellipse', width: 9, depth: 7 },
        quantity: 2,
      },
    });
  });

  it('converts centimetres to inches, kept to a hundredth, and accepts a decimal comma', () => {
    const result = validatePieceDraft({ ...draft, width: '30', depth: '12,7' }, 'cm', [], null);
    expect(result).toMatchObject({ ok: true, fields: { footprint: { width: 11.81, depth: 5 } } });
  });

  it('accepts the limits themselves', () => {
    const edges = { ...draft, width: '0.5', depth: '36', quantity: '20' };
    expect(validatePieceDraft(edges, 'in', [], null).ok).toBe(true);
  });

  it('names every field that is wrong, in the chosen unit', () => {
    const result = validatePieceDraft(
      { ...draft, name: ' ', width: '0.4', depth: 'deep', quantity: '1.5' },
      'cm',
      [],
      null,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'Give the piece a name.',
        width: 'Width must be between 1.3 cm and 91.4 cm.',
        depth: 'Depth must be between 1.3 cm and 91.4 cm.',
        quantity: 'Enter how many you own as a whole number.',
      },
    });
  });

  it('rejects long names, oversize pieces and too many copies', () => {
    const result = validatePieceDraft(
      { ...draft, name: 'x'.repeat(41), width: '36.1', quantity: '21' },
      'in',
      [],
      null,
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: 'Keep the name to 40 characters or fewer.',
        width: 'Width must be between 0.5″ and 36″.',
        quantity: 'You can have 1 to 20 of one piece.',
      },
    });
  });

  it('keeps the whole library within its piece count, not counting the piece being edited', () => {
    const library = [{ ...ruin, quantity: 20 }, ...numbered(78)];
    expect(countPieces(library)).toBe(98);
    expect(validatePieceDraft({ ...draft, quantity: '3' }, 'in', library, null)).toMatchObject({
      errors: { quantity: 'Your library holds 100 pieces in all; there is room for 2 more.' },
    });
    expect(validatePieceDraft({ ...draft, quantity: '20' }, 'in', library, ruin).ok).toBe(true);
  });

  it('refuses a new kind of piece once the library has the most it can hold', () => {
    const full = numbered(LIBRARY_LIMITS.maxKinds);
    expect(validatePieceDraft(draft, 'in', full, null)).toMatchObject({
      ok: false,
      errors: { library: expect.stringContaining('at most 50 different pieces') as unknown },
    });
    expect(validatePieceDraft(draft, 'in', full, full[0] ?? null).ok).toBe(true);
  });
});

describe('draftFootprint', () => {
  it('gives the footprint in inches once both sizes are valid', () => {
    expect(draftFootprint(draft, 'in')).toEqual({ kind: 'ellipse', width: 9, depth: 7 });
    expect(draftFootprint({ ...draft, depth: '' }, 'in')).toBeNull();
    expect(draftFootprint({ ...draft, width: '100' }, 'cm')).toBeNull();
  });
});

describe('drafts from pieces', () => {
  it('shows lengths in the chosen unit and round-trips them', () => {
    const piece = { ...ruin, footprint: { kind: 'rect' as const, width: 11.81, depth: 6 } };
    const inCm = draftFromPiece(piece, 'cm');
    expect(inCm).toMatchObject({ width: '30', depth: '15.2', quantity: '4', shape: 'rect' });
    expect(draftFromPiece(piece, 'in')).toMatchObject({ width: '11.81', depth: '6' });
    const back = validatePieceDraft(draftFromPiece(piece, 'in'), 'in', [piece], piece);
    expect(back).toMatchObject({ ok: true, fields: { footprint: piece.footprint } });
  });

  it('keeps the exact size of a side left unchanged while editing in centimetres', () => {
    const inCm = { ...draftFromPiece(ruin, 'cm'), width: '20' };
    expect(inCm.depth).toBe('15.2');
    expect(validatePieceDraft(inCm, 'cm', [ruin], ruin)).toMatchObject({
      ok: true,
      fields: { footprint: { width: 7.87, depth: 6 } },
    });
    expect(validatePieceDraft(inCm, 'cm', [ruin], null)).toMatchObject({
      fields: { footprint: { depth: 5.98 } },
    });
  });

  it('names a copy, staying within the name limit', () => {
    expect(copyDraft(ruin, 'in').name).toBe('Large ruin (copy)');
    expect(copyDraft({ ...ruin, name: 'y'.repeat(40) }, 'in').name).toHaveLength(40);
  });

  it('starts a new draft as one rectangular ruin', () => {
    expect(EMPTY_DRAFT).toMatchObject({ type: 'ruin', shape: 'rect', quantity: '1' });
  });
});

describe('quantities', () => {
  it('allows a quantity only within the piece and library limits', () => {
    const library = [ruin, ...numbered(90)];
    expect(canSetQuantity(library, ruin, 10)).toBe(true);
    expect(canSetQuantity(library, ruin, 11)).toBe(false);
    expect(canSetQuantity(library, ruin, 0)).toBe(false);
  });
});

describe('photos', () => {
  it('records the footprint ratio and counts versions', () => {
    const once = withPhoto(ruin);
    expect(once.image).toEqual({ version: 1, ratio: 2 });
    expect(withPhoto(once).image).toEqual({ version: 2, ratio: 2 });
    expect(withoutPhoto(once).image).toBeNull();
    expect(withPhoto(once, 1.5).image).toEqual({ version: 2, ratio: 1.5 });
  });

  it('asks for a new crop only when the footprint shape changed', () => {
    const photographed = withPhoto(ruin);
    expect(needsRecrop(ruin)).toBe(false);
    expect(needsRecrop(photographed)).toBe(false);
    const bigger = { kind: 'rect' as const, width: 24, depth: 12 };
    expect(needsRecrop({ ...photographed, footprint: bigger })).toBe(false);
    const square = { kind: 'rect' as const, width: 12, depth: 12 };
    expect(needsRecrop({ ...photographed, footprint: square })).toBe(true);
  });

  it('tells whether a photo fits a footprint', () => {
    expect(photoFits(2, ruin.footprint)).toBe(true);
    expect(photoFits(2.03, ruin.footprint)).toBe(true);
    expect(photoFits(1, ruin.footprint)).toBe(false);
  });

  it('makes a new piece with or without the photo it was added with', () => {
    const fields = { name: ruin.name, type: ruin.type, footprint: ruin.footprint, quantity: 4 };
    expect(newLibraryPiece(fields, 'b', null)).toEqual({ ...ruin, id: 'b' });
    const withCrop = newLibraryPiece(fields, 'b', 2);
    expect(withCrop.image).toEqual({ version: 1, ratio: 2 });
    expect(needsRecrop(withCrop)).toBe(false);
    // A photo cropped before the player changed the shape is kept, and asks to be re-cropped.
    expect(needsRecrop(newLibraryPiece(fields, 'b', 1))).toBe(true);
  });
});

describe('library helpers', () => {
  it('copies the sample set with fresh ids and no photos', () => {
    let next = 0;
    const copied = sampleLibrary(() => `id-${String(next++)}`);
    expect(copied).toHaveLength(SAMPLE_COLLECTION.length);
    expect(copied.map((piece) => piece.id)).toEqual(
      SAMPLE_COLLECTION.map((_, i) => `id-${String(i)}`),
    );
    expect(copied.every((piece) => piece.image === null)).toBe(true);
    expect(copied[0]).toMatchObject({ name: SAMPLE_COLLECTION[0]?.name });
  });

  it('groups pieces by type in type order, names A to Z', () => {
    const forest = { ...ruin, id: 'f', name: 'Forest', type: 'forest' as const };
    const small = { ...ruin, id: 's', name: 'Broken wall' };
    const groups = groupByType([forest, ruin, small]);
    expect(groups.map((group) => group.type)).toEqual(['ruin', 'forest']);
    expect(groups[0]?.pieces.map((piece) => piece.name)).toEqual(['Broken wall', 'Large ruin']);
  });
});

describe('filterLibrary', () => {
  const forest = { ...ruin, id: 'f', name: 'Dark forest', type: 'forest' as const };
  const wall = { ...ruin, id: 'w', name: 'Broken wall' };
  const library = [forest, ruin, wall];

  it('keeps everything, in type order and by name, without a filter', () => {
    expect(filterLibrary(library, NO_FILTER).map((piece) => piece.id)).toEqual(['w', 'a', 'f']);
  });

  it('matches every search word in the name, in any case and order', () => {
    expect(filterLibrary(library, { search: 'RUIN large', type: null })).toEqual([ruin]);
    expect(filterLibrary(library, { search: '  ', type: null })).toHaveLength(3);
    expect(filterLibrary(library, { search: 'large forest', type: null })).toEqual([]);
  });

  it('keeps only the chosen type', () => {
    expect(filterLibrary(library, { search: '', type: 'forest' })).toEqual([forest]);
    expect(filterLibrary(library, { search: 'wall', type: 'forest' })).toEqual([]);
  });

  it('lists the types the library has, in type order', () => {
    expect(typesInLibrary(library)).toEqual(['ruin', 'forest']);
    expect(typesInLibrary([])).toEqual([]);
  });
});
