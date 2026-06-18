'use client';

import { useEffect, useRef, useState } from 'react';
import { useGurmukhiInput } from '@atthebunga/gurmukhi-input';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  mode: 'contains' | 'first_letter' | 'pattern';
  placeholder?: string;
};

type KeyLayout = 'gurmukhi-qwerty' | 'igurbani';

const LAYOUT_STORAGE_KEY = 'gurmukhi-input-layout';

const LAYOUT_OPTIONS: { key: KeyLayout; label: string; hint: string }[] = [
  { key: 'gurmukhi-qwerty', label: 'Gurmukhi Keyboard', hint: 'macOS Gurmukhi - QWERTY layout (t→ਤ, ⌥t→ਟ)' },
  { key: 'igurbani',        label: 'igurbani',           hint: 'igurbani.com phonetic layout (t→ਟ, d→ਡ)' },
];

export default function SearchBar({ value, onChange, onSubmit, mode, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState<KeyLayout>('gurmukhi-qwerty');

  // Restore the saved layout preference on mount
  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === 'gurmukhi-qwerty' || saved === 'igurbani') setLayout(saved);
  }, []);

  function chooseLayout(next: KeyLayout) {
    setLayout(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    inputRef.current?.focus();
  }

  const { onKeyDown, onPaste } = useGurmukhiInput({
    value,
    onChange,
    layout,
    patternMode: mode === 'pattern',
  });

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
      return;
    }
    onKeyDown(e);
  }

  const hints: Record<typeof mode, string> = {
    contains:     'Type Gurmukhi, or type phonetically — no Gurmukhi keyboard needed',
    first_letter: 'Type first letter of each word — p n k → ਪ ਨ ਕ',
    pattern:      'Use _ (any char), * (any sequence), {nasal}, {bilabial}, etc.',
  };

  const activeHint = LAYOUT_OPTIONS.find(o => o.key === layout)?.hint ?? '';

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
            onPaste={onPaste}
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

      {/* Keyboard layout switch */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a6045]">
        <span className="text-xs uppercase tracking-wide text-[#a0896a]">Keyboard</span>
        <div className="inline-flex rounded-md border border-[#c8b89a] bg-[#f5ede0] p-0.5">
          {LAYOUT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => chooseLayout(key)}
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
    </div>
  );
}
