'use client';

import { useEffect, useState } from 'react';

export type KeyLayout = 'gurmukhi-qwerty' | 'igurbani';

const LAYOUT_STORAGE_KEY = 'gurmukhi-input-layout';

export const LAYOUT_OPTIONS: { key: KeyLayout; label: string; hint: string }[] = [
  { key: 'gurmukhi-qwerty', label: 'Gurmukhi Keyboard', hint: 'macOS Gurmukhi - QWERTY layout (t→ਤ, ⌥t→ਟ)' },
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

export function KeyboardLayoutSwitch({
  layout,
  onChange,
}: {
  layout: KeyLayout;
  onChange: (next: KeyLayout) => void;
}) {
  const activeHint = LAYOUT_OPTIONS.find(o => o.key === layout)?.hint ?? '';

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a6045]">
      <span className="text-xs uppercase tracking-wide text-[#a0896a]">Keyboard</span>
      <div className="inline-flex rounded-md border border-[#c8b89a] bg-[#f5ede0] p-0.5">
        {LAYOUT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
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
      <span className="text-xs italic opacity-70">{activeHint}</span>
    </div>
  );
}
