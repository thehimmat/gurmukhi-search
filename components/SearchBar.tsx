'use client';

import { useRef } from 'react';
import { useGurmukhiInput } from '@atthebunga/gurmukhi-input';
import type { KeyLayout } from './KeyboardLayoutSwitch';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  mode: 'contains' | 'first_letter' | 'pattern' | 'letterset';
  placeholder?: string;
  // Owned by the page so the settings row and this box share one choice.
  layout: KeyLayout;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

// Results populate as you type (the page debounces); Enter searches at once.
export default function SearchBar({ value, onChange, onSubmit, mode, placeholder, layout, inputRef: externalRef }: Props) {
  const ownRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? ownRef;

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
    // Short enough not to clip on a 390px phone (#39).
    contains:     'Type Gurmukhi or phonetically',
    first_letter: 'Type first letter of each word — p n k → ਪ ਨ ਕ',
    pattern:      'Use _ (any char), * (any sequence), {nasal}, {bilabial}, etc.',
    letterset:    'Build a set of letters below',
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
      </div>
    </div>
  );
}
