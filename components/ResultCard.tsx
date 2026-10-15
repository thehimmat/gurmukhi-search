'use client';

import type { LineWithMeta } from '@/lib/supabase';
import { NUMBER_ROLE_LABELS, NUMBER_ROLE_HELP, NumberRole, splitBySpans } from '@/lib/numbers';
import { FuzzyLevel, fuzzyHighlightSpans } from '@/lib/fuzzy';
import { lineHref } from '@/lib/viewer';

type Props = {
  line: LineWithMeta;
  query: string;
  mode: 'contains' | 'first_letter' | 'pattern' | 'letterset';
  fuzzyLevel?: FuzzyLevel;
};

// Highlight occurrences of `needle` in `text` by wrapping them in <mark>.
// For first_letter and pattern modes we skip highlighting (regex highlighting is complex).
function HighlightedText({
  text,
  needle,
  mode,
  numeral,
  fuzzyLevel = 0,
}: {
  text: string;
  needle: string;
  mode: Props['mode'];
  numeral?: LineWithMeta['numeral'];
  fuzzyLevel?: FuzzyLevel;
}) {
  // A number result knows exactly which numerals matched, so highlight by
  // offset. Matching on the needle would mark every ੧ in the line, including
  // the verse tallies the role filter just excluded.
  if (numeral?.spans.length) return <Marked text={text} spans={numeral.spans} />;
  if (mode !== 'contains' || !needle) return <span>{text}</span>;
  // A fuzzy match is a spelling variant of the needle, so find it the way the
  // search did (folded), then mark that stretch of the original line.
  if (fuzzyLevel > 0) return <Marked text={text} spans={fuzzyHighlightSpans(text, needle, fuzzyLevel)} />;
  return <Marked text={text} spans={exactSpans(text, needle)} />;
}

// Every occurrence of `needle` in `text`, as offsets.
function exactSpans(text: string, needle: string): { start: number; end: number }[] {
  const spans = [];
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + needle.length)) {
    spans.push({ start: i, end: i + needle.length });
  }
  return spans;
}

function Marked({ text, spans }: { text: string; spans: { start: number; end: number }[] }) {
  return (
    <>
      {splitBySpans(text, spans).map((part, i) =>
        part.marked
          ? <mark key={i} className="bg-[#f5d98e] rounded-sm">{part.text}</mark>
          : <span key={i}>{part.text}</span>,
      )}
    </>
  );
}

export default function ResultCard({ line, query, mode, fuzzyLevel = 0 }: Props) {
  const shabad = line.shabads;

  return (
    // The whole card opens the line in its shabad (the kosh viewer).
    <a
      href={lineHref(line.id)}
      className="block border border-[#ddd0be] rounded-lg bg-[#fdf9f3] p-4 hover:border-[#c8b89a] hover:bg-[#fbf4e8] transition-colors no-underline"
      style={{ textDecoration: 'none' }}
    >
      {/* Gurmukhi text */}
      <p
        className="text-2xl leading-relaxed text-[#1a1008] mb-2"
        style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}
      >
        <HighlightedText text={line.gurmukhi} needle={query} mode={mode} numeral={line.numeral} fuzzyLevel={fuzzyLevel} />
      </p>

      {/* Why this line matched a number query: ਮਹਲਾ ਪਹਿਲਾ ੧ ਘਰੁ ੧ matches in
          two roles at once, so every matched role is shown. */}
      {line.numeral && line.numeral.roles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {line.numeral.roles.map((role) => (
            <span
              key={role}
              title={NUMBER_ROLE_HELP[role as NumberRole] ?? role}
              className="text-xs text-[#7a6045] border border-dashed border-[#c8b89a] rounded-full px-2 py-0.5"
            >
              {NUMBER_ROLE_LABELS[role as NumberRole] ?? role}
            </span>
          ))}
        </div>
      )}

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
    </a>
  );
}
