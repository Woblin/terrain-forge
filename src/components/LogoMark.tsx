interface LogoMarkProps {
  /** Size classes; 30 × 34 by default. */
  className?: string;
}

/** The Terrain Forge mark: a heraldic shield in seal red with a brass edge and a board grid. */
export function LogoMark({ className = 'h-[34px] w-[30px]' }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 30 34" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path
        d="M2 2h26v13c0 9-6 14.5-13 17C8 29.5 2 24 2 15Z"
        strokeWidth={1.5}
        className="fill-seal stroke-brass-bright"
      />
      <path
        d="M7 8h16M7 14h16M7 20h14M12 5v21M18 5v19"
        strokeWidth={1.2}
        fill="none"
        opacity={0.9}
        className="stroke-[#e8cf8f]"
      />
    </svg>
  );
}
