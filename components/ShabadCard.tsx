'use client';

import type { ShabadGroup } from '@/lib/feed';
import { SOURCE_IDS, SOURCE_NAMES } from '@/lib/scriptures';

// One shabad (or, for Sri Sarbloh Granth, one ang) from the reading feed:
// where it is, then its lines with their translations.
export function ShabadCard({ group }: { group: ShabadGroup }) {
  const first = group.lines[0];
  const shabad = first.shabads;
  const sggs = first.source_fk === SOURCE_IDS.sggs;

  return (
    <article className="rounded-lg border border-[#ddd0be] bg-[#fdf9f3] p-4">
      <header className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7a6045]">
        {!sggs && <span className="font-medium">{SOURCE_NAMES[first.source_fk] ?? 'Gurbani'}</span>}
        {sggs
          ? <a href={`/ang/${first.ang}`} className="hover:underline"><span className="font-medium">Ang</span> {first.ang}</a>
          : <span><span className="font-medium">Ang</span> {first.ang}</span>}
        {shabad?.raag_english && (
          <span>
            <span style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>{shabad.raag_gurmukhi}</span> ({shabad.raag_english})
          </span>
        )}
        {shabad?.writer_english && <span>{shabad.writer_english}</span>}
      </header>

      <div className="flex flex-col gap-2">
        {group.lines.map(l => (
          <div key={l.id}>
            <p className="text-xl leading-relaxed text-[#1a1008]" style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>
              {l.gurmukhi}
            </p>
            {l.translation_en && (
              <p className="text-sm text-[#5c3d1e]" style={{ fontFamily: '"Crimson Pro", serif' }}>{l.translation_en}</p>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
