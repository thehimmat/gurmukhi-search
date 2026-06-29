'use client';

import { listCategories } from '@/lib/pattern-compiler';

export default function PatternHelp() {
  const categories = listCategories();

  return (
    <details className="text-sm text-[#5c3d1e]">
      <summary className="cursor-pointer hover:text-[#3d2b1f] select-none list-none flex items-center gap-1">
        <span className="text-xs">▶</span> Pattern syntax reference
      </summary>

      <div className="mt-3 space-y-4">
        <p className="text-xs text-[#7a6045]">
          Use the <span className="font-medium">Words / Lines</span> toggle to match the
          pattern against single words or whole Gurbani lines.
        </p>

        <div>
          <p className="font-medium mb-1">Wildcards</p>
          <table className="text-xs w-full border-collapse">
            <tbody>
              {[
                ['_', 'Any single character'],
                ['*', 'Any sequence of characters (zero or more)'],
                ['(ਅ|ਇ|ੳ)', 'Any of these alternatives'],
                ['{categoryName}', 'Any character in the named category'],
              ].map(([sym, desc]) => (
                <tr key={sym} className="border-b border-[#e8d8c0]">
                  <td className="py-1 pr-3 font-mono text-[#8b5e3c]" style={{ fontFamily: 'monospace' }}>{sym}</td>
                  <td className="py-1">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="font-medium mb-1">Examples</p>
          <table className="text-xs w-full border-collapse">
            <tbody>
              {[
                ['ੁ', 'Any consonant + short-u matra (diacritic auto-gets a base char)'],
                ['{nasal}ਾ', 'A nasal consonant followed by the aa vowel sign'],
                ['ਪ*ਨ', 'ਪ, then anything, then ਨ — anywhere in a word'],
                ['{bilabial}_{bilabial}', 'Two bilabials with one char in between'],
                ['*{ooraVowels}*', 'Word contains any oora-family vowel'],
              ].map(([pat, desc]) => (
                <tr key={pat} className="border-b border-[#e8d8c0]">
                  <td
                    className="py-1 pr-3 text-lg"
                    style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}
                  >{pat}</td>
                  <td className="py-1 text-xs">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <p className="font-medium mb-1">Available categories</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(({ name, chars }) => (
              <span
                key={name}
                title={chars.join('  ')}
                className="px-2 py-0.5 rounded bg-[#f0e4d0] font-mono text-xs cursor-help"
              >
                {'{' + name + '}'}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#a0896a]">Hover any category to see its characters.</p>
        </div>
      </div>
    </details>
  );
}
