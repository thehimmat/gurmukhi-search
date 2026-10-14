'use client';

import { useEffect, useState } from 'react';

const FUZZY_STORAGE_KEY = 'gurmukhi-search-fuzzy';

// Fuzzy matching preference, off by default and persisted like the keyboard
// layout. Today it widens Dictionary lookups to spelling variants (the
// search_fold key); line search does not use it yet.
export function useFuzzySetting() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(FUZZY_STORAGE_KEY) === '1') setOn(true);
    } catch {}
  }, []);

  function choose(next: boolean) {
    setOn(next);
    try { localStorage.setItem(FUZZY_STORAGE_KEY, next ? '1' : '0'); } catch {}
  }

  return { on, choose };
}

export function FuzzyToggle({ on, onChange, note }: { on: boolean; onChange: (next: boolean) => void; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[#7a6045]">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Fuzzy search"
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-[#8b5e3c]' : 'bg-[#d8c8ac]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </button>
      <span>{on ? 'On' : 'Off'}</span>
      {note && <span className="italic opacity-70">{note}</span>}
    </div>
  );
}
