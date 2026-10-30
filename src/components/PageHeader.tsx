import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** For the page's section to point `aria-labelledby` at its title. */
  id?: string;
  /** The line under the title: counts and save state, joined by dots. */
  details: readonly ReactNode[];
  /** Controls and the page's main button, on the right. */
  actions: ReactNode;
}

/** A page's title on the leather, with a line of details and the page's main actions. */
export function PageHeader({ title, id, details, actions }: PageHeaderProps) {
  const shown = details.filter((detail) => detail !== null && detail !== false);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1
          id={id}
          className="font-display text-on-iron-bright text-[32px] leading-[1.05] md:text-4xl"
        >
          {title}
        </h1>
        {shown.length > 0 && (
          <p className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {shown.map((detail, i) => (
              <span key={i} className="contents">
                {i > 0 && <span aria-hidden="true">·</span>}
                {detail}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">{actions}</div>
    </div>
  );
}
