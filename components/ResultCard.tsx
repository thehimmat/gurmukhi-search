'use client';

import { LineWithMeta } from '@/lib/supabase';

type Props = {
  line: LineWithMeta;
  query: string;
  mode: 'contains' | 'first_letter' | 'pattern' | 'letterset';
};

// Highlight occurrences of `needle` in `text` by wrapping them in <mark>.
// For first_letter and pattern modes we skip highlighting (regex highlighting is complex).
function HighlightedText({ text, needle, mode }: { text: string; needle: string; mode: Props['mode'] }) {
  if (mode !== 'contains' || !needle) {
    return <span>{text}</span>;
  }
  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'));
  return (
    <>
      {parts.map((part, i) =>
        part === needle
          ? <mark key={i} className="bg-[#f5d98e] rounded-sm">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function ResultCard({ line, query, mode }: Props) {
  const shabad = line.shabads;

  return (
    <div className="border border-[#ddd0be] rounded-lg bg-[#fdf9f3] p-4 hover:border-[#c8b89a] transition-colors">
      {/* Gurmukhi text */}
      <p
        className="text-2xl leading-relaxed text-[#1a1008] mb-2"
        style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}
      >
        <HighlightedText text={line.gurmukhi} needle={query} mode={mode} />
      </p>

      {/* Transliteration */}
      {line.transliteration_en && (
        <p className="text-sm text-[#5c3d1e] italic mb-1" style={{ fontFamily: '"Crimson Pro", serif' }}>
          {line.transliteration_en}
        </p>
      )}

      {/* Translation */}
      {line.translation_en && (
        <p className="text-sm text-[#3d2b1f]" style={{ fontFamily: '"Crimson Pro", serif' }}>
          {line.translation_en}
        </p>
      )}

      {/* Metadata row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7a6045]">
        <span>
          <span className="font-medium">Ang</span> {line.ang}
        </span>
        {shabad?.raag_english && (
          <span>
            <span className="font-medium">Raag</span>{' '}
            <span style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>{shabad.raag_gurmukhi}</span>
            {' '}({shabad.raag_english})
          </span>
        )}
        {shabad?.writer_english && (
          <span>
            <span className="font-medium">Writer</span> {shabad.writer_english}
          </span>
        )}
      </div>
    </div>
  );
}
