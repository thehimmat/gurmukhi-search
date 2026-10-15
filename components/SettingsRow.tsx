'use client';

import { ReactNode, useState } from 'react';

export type SettingsItem = {
  id: string;
  label: string;
  // Shown beside the label while collapsed, e.g. the number of active filters.
  badge?: number;
  content: ReactNode;
};

// A single line of collapsed "Label ›" toggles under the search box. One panel
// is open at a time and renders full-width below the row, so a wide panel
// (Filters) never pushes the other toggles around.
export function SettingsRow({ items, defaultOpen }: { items: SettingsItem[]; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  const active = items.find(i => i.id === open);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {items.map(item => {
          const isOpen = item.id === open;
          return (
            <button
              key={item.id}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : item.id)}
              className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide transition-colors ${
                isOpen ? 'text-[#5c3d1e]' : 'text-[#a0896a] hover:text-[#5c3d1e]'
              }`}
            >
              {item.label}
              {item.badge ? (
                <span className="normal-case text-[10px] bg-[#8b5e3c] text-[#fdf6ec] rounded-full px-1.5">{item.badge}</span>
              ) : null}
              <span aria-hidden className={`inline-block transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
            </button>
          );
        })}
      </div>
      {active && <div>{active.content}</div>}
    </div>
  );
}
