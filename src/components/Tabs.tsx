import { useId, type ReactNode } from 'react';

export interface Tab<T extends string> {
  readonly id: T;
  readonly label: ReactNode;
  readonly content: ReactNode;
}

interface TabsProps<T extends string> {
  label: string;
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Classes for the panel below the tabs, for example to let it scroll. */
  panelClassName?: string;
}

/** Tabs that show one panel at a time. Arrow keys move between tabs. */
export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  panelClassName = '',
}: TabsProps<T>) {
  const id = useId();
  const active = tabs.find((tab) => tab.id === value) ?? tabs[0];

  function step(by: number): void {
    const index = tabs.findIndex((tab) => tab.id === value);
    const next = tabs[(index + by + tabs.length) % tabs.length];
    if (next !== undefined) {
      onChange(next.id);
      document.getElementById(`${id}-tab-${next.id}`)?.focus();
    }
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        className="border-brass font-display flex shrink-0 border-b text-[17px]"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              id={`${id}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                onChange(tab.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  step(event.key === 'ArrowRight' ? 1 : -1);
                }
              }}
              className={`focus-visible:outline-accent-ink -mb-px flex-1 rounded-t-sm border border-b-0 px-3 pt-2 pb-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2 pointer-coarse:min-h-11 ${selected ? 'border-brass bg-raised text-accent-ink' : 'text-soft hover:text-ink border-transparent'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={active === undefined ? undefined : `${id}-tab-${active.id}`}
        className={panelClassName}
      >
        {active?.content}
      </div>
    </>
  );
}
