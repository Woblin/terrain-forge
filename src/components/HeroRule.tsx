interface HeroRuleProps {
  children: string;
}

/** A small brass rule ending in a diamond, then a label, above the home page's title. */
export function HeroRule({ children }: HeroRuleProps) {
  return (
    <p className="font-display text-brass-bright flex items-center gap-2.5 text-lg">
      <svg width="36" height="8" viewBox="0 0 36 8" aria-hidden="true">
        <path d="M0 4H28" strokeWidth={1} className="stroke-brass" />
        <path d="M32 0.5 35.5 4 32 7.5 28.5 4Z" className="fill-brass" />
      </svg>
      {children}
    </p>
  );
}
