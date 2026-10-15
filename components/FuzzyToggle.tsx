'use client';

import { useEffect, useState } from 'react';
import { FUZZY_LEVELS, FuzzyLevel, parseFuzzyLevel } from '@/lib/fuzzy';

const FUZZY_STORAGE_KEY = 'gurmukhi-search-fuzzy-level';

// Fuzzy level preference, Off by default and remembered like the keyboard
// layout. One setting drives Contains, First Letter and the Dictionary.
export function useFuzzyLevel() {
  const [level, setLevel] = useState<FuzzyLevel>(0);

  useEffect(() => {
    try {
      setLevel(parseFuzzyLevel(localStorage.getItem(FUZZY_STORAGE_KEY)));
    } catch {}
  }, []);

  function choose(next: FuzzyLevel) {
    setLevel(next);
    try { localStorage.setItem(FUZZY_STORAGE_KEY, String(next)); } catch {}
  }

  return { level, choose };
}

export function FuzzyLevelPicker({ level, onChange }: { level: FuzzyLevel; onChange: (next: FuzzyLevel) => void }) {
  const hint = FUZZY_LEVELS.find(l => l.level === level)?.hint;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a6045]">
      <div role="radiogroup" aria-label="Fuzzy search" className="inline-flex rounded-md border border-[#c8b89a] bg-[#f5ede0] p-0.5">
        {FUZZY_LEVELS.map(l => (
          <button
            key={l.level}
            type="button"
            role="radio"
            aria-checked={level === l.level}
            onClick={() => onChange(l.level)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              level === l.level ? 'bg-white text-[#5c3d1e] shadow-sm' : 'text-[#a0896a] hover:text-[#5c3d1e]'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      {hint && <span className="text-xs italic opacity-70">{hint}</span>}
    </div>
  );
}
