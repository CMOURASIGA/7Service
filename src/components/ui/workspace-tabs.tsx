'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface WorkspaceTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * One active panel at a time. Inactive panels stay mounted so switching tabs
 * never clears in-progress form fields or server-action feedback.
 */
export function WorkspaceTabs({
  tabs,
  label = 'Seções da página',
}: {
  tabs: WorkspaceTab[];
  label?: string;
}) {
  const [selected, setSelected] = useState(tabs[0]?.id ?? '');
  const prefix = useId().replace(/:/g, '');
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === selected),
  );

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setSelected(tabs[next].id);
    const target =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    target?.focus();
  }

  if (!tabs.length) return null;

  return (
    <div className="min-w-0 space-y-5">
      <div className="overflow-x-auto border-b border-slate-200" aria-label={label}>
        <div role="tablist" aria-label={label} className="flex min-w-max gap-1">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${prefix}-tab-${tab.id}`}
              aria-controls={`${prefix}-panel-${tab.id}`}
              aria-selected={index === i}
              tabIndex={index === i ? 0 : -1}
              onClick={() => setSelected(tab.id)}
              onKeyDown={(event) => handleKey(event, i)}
              className={
                'min-h-11 rounded-t-md border border-b-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ' +
                (index === i
                  ? 'border-slate-300 bg-white text-blue-900 shadow-[inset_0_3px_0_0_#07559b]'
                  : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-blue-900')
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((tab, i) => (
        <section
          key={tab.id}
          role="tabpanel"
          id={`${prefix}-panel-${tab.id}`}
          aria-labelledby={`${prefix}-tab-${tab.id}`}
          tabIndex={0}
          hidden={index !== i}
          className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          {tab.content}
        </section>
      ))}
    </div>
  );
}
