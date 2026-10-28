import type { BoardPiece } from './editor';

/**
 * The order to set pieces out on the table: across the board from the left short edge to the
 * right one, and from top to bottom where two pieces stand level.
 */
export function placingOrder(pieces: readonly BoardPiece[]): string[] {
  return [...pieces]
    .sort(
      (a, b) =>
        a.placement.position.x - b.placement.position.x ||
        a.placement.position.y - b.placement.position.y,
    )
    .map((piece) => piece.key);
}

/**
 * The piece `step` places on from `current` in the order, going round at the ends. With nothing
 * current, Next starts at the first piece and Previous at the last.
 */
export function stepPiece(
  order: readonly string[],
  current: string | null,
  step: 1 | -1,
): string | null {
  if (order.length === 0) {
    return null;
  }
  const index = current === null ? -1 : order.indexOf(current);
  const start = index === -1 ? (step === 1 ? -1 : 0) : index;
  const next = (start + step + order.length) % order.length;
  return order[next] ?? null;
}
