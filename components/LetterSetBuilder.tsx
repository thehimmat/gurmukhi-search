'use client';

import { useRef, useState } from 'react';
import { useGurmukhiInput } from '@atthebunga/gurmukhi-input';
import { useKeyboardLayout, KeyboardLayoutSwitch } from './KeyboardLayoutSwitch';
import {
  isBaseChar,
  MUKTA_SYMBOL,
  VOWEL_SIGN_OPTIONS,
} from '@/lib/gurmukhi-chars';
import {
  LetterSetQuery,
  ExtraMode,
  describeLetterSet,
  validateLetterSet,
} from '@/lib/letterset';
import ScopeToggle from './ScopeToggle';

type Props = {
  query: LetterSetQuery;
  onChange: (q: LetterSetQuery) => void;
  onSubmit: () => void;
};

const EXTRA_OPTIONS: { id: ExtraMode; label: string; desc: string }[] = [
  { id: 'none', label: 'Only these letters', desc: 'Words built solely from the set' },
  { id: 'limited', label: 'Up to N wildcards', desc: 'Allow a few any-letter slots (Scrabble blanks)' },
  { id: 'unlimited', label: 'Any other letters', desc: 'Must contain the set; anything else allowed' },
];

const chipBase =
  'px-2.5 py-1 rounded-md text-sm font-medium border transition-colors cursor-pointer select-none';

export default function LetterSetBuilder({ query, onChange, onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const { layout, choose } = useKeyboardLayout();
  const { onKeyDown, onPaste } = useGurmukhiInput({ value: draft, onChange: setDraft, layout });

  const valid = validateLetterSet(query);

  function commitDraft() {
    const bases = [...draft].filter(isBaseChar);
    if (bases.length) {
      const next = [...query.letters];
      for (const b of bases) if (!next.includes(b)) next.push(b);
      onChange({ ...query, letters: next });
    }
    setDraft('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commitDraft();
      return;
    }
    onKeyDown(e);
  }

  function removeLetter(ch: string) {
    onChange({ ...query, letters: query.letters.filter((l) => l !== ch) });
  }

  function toggleSign(sign: string) {
    const has = query.vowels.signs.includes(sign);
    onChange({
      ...query,
      vowels: {
        ...query.vowels,
        signs: has
          ? query.vowels.signs.filter((s) => s !== sign)
          : [...query.vowels.signs, sign],
      },
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#ddd0be] bg-[#fdf9f3] p-4">
      {/* Rack input + chips */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#3d2b1f]">Letters in the set</label>
        <div className="flex flex-wrap items-center gap-2">
          {query.letters.map((ch) => (
            <button
              key={ch}
              onClick={() => removeLetter(ch)}
              title="Remove"
              className="flex items-center gap-1 rounded-md bg-[#8b5e3c] px-2.5 py-1 text-[#fdf6ec]"
            >
              <span className="text-lg" style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>{ch}</span>
              <span className="text-xs opacity-70">×</span>
            </button>
          ))}
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            onBlur={commitDraft}
            placeholder={query.letters.length ? 'add…' : 'type letters, e.g. ਚ ਸ ਹ'}
            className="min-w-[8rem] flex-1 rounded-md border border-[#c8b89a] bg-white px-3 py-1.5 text-lg
                       focus:outline-none focus:ring-2 focus:ring-[#8b5e3c]
                       placeholder:text-sm placeholder:text-[#a0896a]"
            style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}
          />
        </div>
        <KeyboardLayoutSwitch layout={layout} onChange={(n) => { choose(n); inputRef.current?.focus(); }} />
      </div>

      {/* Scope */}
      <ScopeToggle value={query.scope} onChange={(scope) => onChange({ ...query, scope })} />

      {/* Vowel handling */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-[#3d2b1f]">Vowels on each letter</legend>
        <div className="flex flex-wrap gap-4 text-sm text-[#5c3d1e]">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="vmode"
              checked={query.vowelMode === 'any'}
              onChange={() => onChange({ ...query, vowelMode: 'any' })}
            />
            Any vowels
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="vmode"
              checked={query.vowelMode === 'only'}
              onChange={() => onChange({ ...query, vowelMode: 'only' })}
            />
            Only these vowels
          </label>
        </div>
        {query.vowelMode === 'only' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onChange({ ...query, vowels: { ...query.vowels, mukta: !query.vowels.mukta } })}
              title="mukta — no vowel sign (inherent /ə/)"
              className={`${chipBase} ${
                query.vowels.mukta
                  ? 'border-[#8b5e3c] bg-[#8b5e3c] text-[#fdf6ec]'
                  : 'border-[#c8b89a] bg-white text-[#5c3d1e]'
              }`}
            >
              {MUKTA_SYMBOL} <span className="text-xs opacity-70">mukta</span>
            </button>
            {VOWEL_SIGN_OPTIONS.map(({ sign, name }) => {
              const on = query.vowels.signs.includes(sign);
              return (
                <button
                  key={sign}
                  onClick={() => toggleSign(sign)}
                  title={name}
                  className={`${chipBase} ${
                    on
                      ? 'border-[#8b5e3c] bg-[#8b5e3c] text-[#fdf6ec]'
                      : 'border-[#c8b89a] bg-white text-[#5c3d1e]'
                  }`}
                >
                  <span className="text-lg" style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>
                    {'◌' + sign}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {/* What else is allowed */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-[#3d2b1f]">Besides these letters</legend>
        <div className="flex flex-col gap-1.5 text-sm text-[#5c3d1e]">
          {EXTRA_OPTIONS.map((o) => (
            <label key={o.id} className="flex items-center gap-1.5" title={o.desc}>
              <input
                type="radio"
                name="extra"
                checked={query.extra === o.id}
                onChange={() => onChange({ ...query, extra: o.id })}
              />
              {o.label}
              {o.id === 'limited' && query.extra === 'limited' && (
                <select
                  value={query.wildcardSlots}
                  onChange={(e) => onChange({ ...query, wildcardSlots: parseInt(e.target.value, 10) })}
                  className="ml-1 rounded border border-[#c8b89a] bg-white px-1.5 py-0.5 text-sm"
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>{n} slot{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Repeats */}
      <label
        className={`flex items-center gap-1.5 text-sm ${
          query.extra === 'unlimited' ? 'text-[#a0896a]' : 'text-[#5c3d1e]'
        }`}
        title={query.extra === 'unlimited' ? 'Not applicable when other letters are allowed' : undefined}
      >
        <input
          type="checkbox"
          checked={query.repeat}
          disabled={query.extra === 'unlimited'}
          onChange={(e) => onChange({ ...query, repeat: e.target.checked })}
        />
        Letters may repeat
      </label>

      {/* Live summary + submit */}
      <div className="flex items-center justify-between gap-3 border-t border-[#e8d8c0] pt-3">
        <p className="text-sm italic text-[#7a6045]">{describeLetterSet(query)}</p>
        <button
          onClick={onSubmit}
          disabled={!valid.ok}
          className="shrink-0 rounded-lg bg-[#8b5e3c] px-5 py-2 font-medium text-[#fdf6ec]
                     transition-colors hover:bg-[#6d4a2d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Search
        </button>
      </div>
      {!valid.ok && draft === '' && query.letters.length > 0 && (
        <p className="text-sm text-[#dc2626]">{valid.error}</p>
      )}
    </div>
  );
}
