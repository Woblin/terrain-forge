/** A rectangle with an oval hole, to darken what falls outside a round piece. */
export function ovalMask(width: number, height: number): string {
  const rx = width / 2;
  const ry = height / 2;
  return [
    `M0 0H${String(width)}V${String(height)}H0Z`,
    `M0 ${String(ry)}a${String(rx)} ${String(ry)} 0 1 0 ${String(width)} 0`,
    `a${String(rx)} ${String(ry)} 0 1 0 ${String(-width)} 0Z`,
  ].join('');
}
