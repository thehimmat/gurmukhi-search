'use client';

import { useRef } from 'react';
import { useGurmukhiInput } from '@atthebunga/gurmukhi-input';
import { useKeyboardLayout, KeyboardLayoutSwitch } from './KeyboardLayoutSwitch';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  mode: 'contains' | 'first_letter' | 'pattern';
  placeholder?: string;
};

export default function SearchBar({ value, onChange, onSubmit, mode, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { layout, choose } = useKeyboardLayout();

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

      <KeyboardLayoutSwitch
        layout={layout}
        onChange={next => { choose(next); inputRef.current?.focus(); }}
      />
    </div>
  );
}
