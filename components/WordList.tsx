'use client';

import { Word } from '@/lib/supabase';

// Renders word-scope search results: each matching dictionary word with its
// occurrence count, linking to its kosh entry.
export default function WordList({ words }: { words: Word[] }) {
  return (
    <ul className="overflow-hidden rounded-lg border border-[#ddd0be] bg-white">
      {words.map((word, i) => (
        <li key={word.id}>
          <a
            href={`/word/${encodeURIComponent(word.gurmukhi)}`}
            className={`flex items-baseline gap-4 px-4 py-3 hover:bg-[#f7efe2] ${
              i === 0 ? '' : 'border-t border-[#eee0cc]'
            }`}
          >
            <span
              className="flex-1 text-2xl text-[#1a1008]"
              style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}
            >
              {word.gurmukhi}
            </span>
            <span
              className="shrink-0 rounded-full bg-[#f0e4d0] px-2 py-0.5 text-xs text-[#7a6045]"
              title="occurrences in SGGS"
            >
              {word.frequency.toLocaleString()}×
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
