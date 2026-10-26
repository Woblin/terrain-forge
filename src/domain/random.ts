export type RandomSource = () => number;

/** Seeded PRNG (mulberry32). Returns numbers in [0, 1); the same seed always gives the same sequence. */
export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [min, max). */
export function randomBetween(random: RandomSource, min: number, max: number): number {
  return min + random() * (max - min);
}

/** An integer in [min, max], both ends included. */
export function randomInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function pick<T>(random: RandomSource, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) {
    throw new Error('Cannot pick from an empty list.');
  }
  return item;
}

/** A shuffled copy (Fisher-Yates); the input is left unchanged. */
export function shuffle<T>(random: RandomSource, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

const SEED_CODE_LENGTH = 7;
const MAX_SEED = 0xffffffff;

/** A short shareable code for a seed, for example `00K7QF2`. */
export function seedToCode(seed: number): string {
  return (seed >>> 0).toString(36).toUpperCase().padStart(SEED_CODE_LENGTH, '0');
}

/** The seed for a code from `seedToCode`, or `null` if the code is not valid. */
export function codeToSeed(code: string): number | null {
  const trimmed = code.trim();
  if (!/^[0-9a-z]{1,7}$/i.test(trimmed)) {
    return null;
  }
  const seed = parseInt(trimmed, 36);
  return seed <= MAX_SEED ? seed : null;
}
