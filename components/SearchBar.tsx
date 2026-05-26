'use client';

import { useRef, useState } from 'react';
import { lookupRoman } from '@/lib/roman-to-gurmukhi';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  mode: 'contains' | 'first_letter' | 'pattern';
  placeholder?: string;
};

export default function SearchBar({ value, onChange, onSubmit, mode, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRomanMode, setIsRomanMode] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }

    // In roman mode, intercept printable ASCII keys and convert to Gurmukhi.
    // Pattern mode: pass through pattern syntax chars (_, *, {, }, (, ), |) unchanged.
    if (!isRomanMode) return;

    const patternPassthrough = new Set(['_', '*', '{', '}', '(', ')', '|', ' ', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab']);
    if (e.key.length !== 1 || patternPassthrough.has(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // In pattern mode, let { start a category name (don't convert its contents)
    if (mode === 'pattern' && value.includes('{') && !value.includes('}')) {
      return; // inside a category name — don't convert
    }

    const gurmukhi = lookupRoman(e.key);
    if (gurmukhi) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? value.length;
      const end   = el.selectionEnd   ?? value.length;
      const next = value.slice(0, start) + gurmukhi + value.slice(end);
      onChange(next);
      // move cursor after inserted char
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + gurmukhi.length;
      });
    }
  }

  const hints: Record<typeof mode, string> = {
    contains:     'Type or paste Gurmukhi, or type roman letters with phonetic mode on',
    first_letter: 'Type first letter of each word — e.g. p n k → ਪ ਨ ਕ',
    pattern:      'Use _ (any char), * (any sequence), {nasal}, {bilabial}, etc.',
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? hints[mode]}
            className="w-full px-4 py-3 rounded-lg border border-[#c8b89a] bg-[#fdf6ec]
                       text-xl font-gurmukhi focus:outline-none focus:ring-2 focus:ring-[#8b5e3c]
                       placeholder:text-sm placeholder:font-sans placeholder:text-[#a0896a]"
            style={{ fontFamily: '"Noto Sans Gurmukhi", serif', direction: 'ltr' }}
            autoFocus
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0896a] hover:text-[#5c3d1e] text-lg"
              aria-label="Clear"
            >×</button>
          )}
        </div>
        <button
          onClick={onSubmit}
          className="px-5 py-3 bg-[#8b5e3c] text-[#fdf6ec] rounded-lg font-medium
                     hover:bg-[#6d4a2d] transition-colors"
        >
          Search
        </button>
      </div>

      <div className="flex gap-3 items-center text-sm text-[#7a6045]">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRomanMode}
            onChange={e => setIsRomanMode(e.target.checked)}
            className="accent-[#8b5e3c]"
          />
          Phonetic input (roman → Gurmukhi)
        </label>
        {isRomanMode && (
          <span className="text-xs italic opacity-70">
            e.g. p→ਪ, k→ਕ, n→ਨ, g→ਗ, j→ਜ, q→ਤ, z→ਦ — paste Unicode to bypass
          </span>
        )}
      </div>
    </div>
  );
}
