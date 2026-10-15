'use client';

import { useEffect, useState } from 'react';
import { SettingsRow } from './SettingsRow';

export type KeyLayout = 'gurmukhi-qwerty' | 'igurbani';

const LAYOUT_STORAGE_KEY = 'gurmukhi-input-layout';

export const LAYOUT_OPTIONS: { key: KeyLayout; label: string; hint?: string }[] = [
  { key: 'gurmukhi-qwerty', label: 'Gurmukhi Keyboard' },
  { key: 'igurbani',        label: 'igurbani',           hint: 'igurbani.com phonetic layout (t→ਟ, d→ਡ)' },
];

// Shared keyboard-layout preference, persisted to localStorage so the choice
// is consistent across every search box and across visits.
export function useKeyboardLayout() {
  const [layout, setLayout] = useState<KeyLayout>('gurmukhi-qwerty');

  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === 'gurmukhi-qwerty' || saved === 'igurbani') setLayout(saved);
  }, []);

  function choose(next: KeyLayout) {
    setLayout(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
  }

  return { layout, choose };
}

// The layout buttons alone, for use as the Keyboard panel of a SettingsRow.
export function KeyboardLayoutOptions({
  layout,
  onChange,
}: {
  layout: KeyLayout;
  onChange: (next: KeyLayout) => void;
}) {
  const activeHint = LAYOUT_OPTIONS.find(o => o.key === layout)?.hint;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a6045]">
      <div className="inline-flex rounded-md border border-[#c8b89a] bg-[#f5ede0] p-0.5">
        {LAYOUT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              layout === key
                ? 'bg-white text-[#5c3d1e] shadow-sm'
                : 'text-[#a0896a] hover:text-[#5c3d1e]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {activeHint && <span className="text-xs italic opacity-70">{activeHint}</span>}
    </div>
  );
}

// A collapsed "Keyboard ›" toggle on its own, for inputs with no other settings.
export function KeyboardLayoutSwitch({
  layout,
  onChange,
  defaultOpen = false,
}: {
  layout: KeyLayout;
  onChange: (next: KeyLayout) => void;
  defaultOpen?: boolean;
}) {
  return (
    <SettingsRow
      defaultOpen={defaultOpen ? 'keyboard' : undefined}
      items={[{ id: 'keyboard', label: 'Keyboard', content: <KeyboardLayoutOptions layout={layout} onChange={onChange} /> }]}
    />
  );
}
