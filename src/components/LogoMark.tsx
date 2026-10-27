import { Grid3x3Icon } from 'lucide-react';

/** The Terrain Forge mark: a small board grid on an amber tile. */
export function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="text-on-accent grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br from-amber-300 to-amber-500 shadow-sm"
    >
      <Grid3x3Icon className="size-[18px]" />
    </span>
  );
}
