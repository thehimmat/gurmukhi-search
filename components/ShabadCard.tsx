'use client';

import { useState } from 'react';
import { leadLineIndex, type FeedLine, type ShabadGroup } from '@/lib/feed';
import { sourceById } from '@/lib/sources';
import { useSources } from './SourcesContext';
import { lineHref } from '@/lib/viewer';

// One shabad (or, for Sri Sarbloh Granth, one ang) from the reading feed:
// where it is, then its opening line, like a search result. The rest of the
// shabad opens in place.
export function ShabadCard({ group }: { group: ShabadGroup }) {
  const [expanded, setExpanded] = useState(false);
  const first = group.lines[0];
  const shabad = first.shabads;
  const source = sourceById(useSources().sources, first.source_fk);
  const sggs = source?.slug === 'sggs';
  const unit = source?.pageUnit ?? 'Ang';
  const shown = expanded ? group.lines : [group.lines[leadLineIndex(group.lines)]];

  return (
    <article className="rounded-lg border border-[#ddd0be] bg-[#fdf9f3] p-4">
      <header className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7a6045]">
        {!sggs && <span className="font-medium">{source?.name ?? 'Gurbani'}</span>}
        {sggs
          ? <a href={`/ang/${first.ang}`} className="hover:underline"><span className="font-medium">Ang</span> {first.ang}</a>
          : <span><span className="font-medium">{unit}</span> {first.ang}</span>}
        {shabad?.raag_english && (
          <span>
            <span style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>{shabad.raag_gurmukhi}</span> ({shabad.raag_english})
          </span>
        )}
        {shabad?.writer_english && <span>{shabad.writer_english}</span>}
      </header>

      <div className="flex flex-col gap-2">
        {shown.map(l => <Line key={l.id} line={l} />)}
      </div>

      {group.lines.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="mt-2 text-xs text-[#8b5e3c] hover:underline"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          {expanded ? 'Show less' : `Show all ${group.lines.length} lines`}
        </button>
      )}
    </article>
  );
}

// A line opens in its shabad in the viewer (gurmukhi-kosh#146).
function Line({ line }: { line: FeedLine }) {
  return (
    <div>
      <a href={lineHref(line.id)} className="block text-xl leading-relaxed text-[#1a1008] hover:text-[#8b5e3c]" style={{ fontFamily: '"Noto Sans Gurmukhi", serif', textDecoration: 'none' }}>
        {line.gurmukhi}
      </a>
      {line.translation_en && (
        <p className="text-sm text-[#5c3d1e]" style={{ fontFamily: '"Crimson Pro", serif' }}>{line.translation_en}</p>
      )}
    </div>
  );
}
