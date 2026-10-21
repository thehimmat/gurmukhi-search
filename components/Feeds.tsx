'use client';

import { InfiniteList } from './InfiniteList';
import { ShabadCard } from './ShabadCard';
import { useCursorFeed } from './useCursorFeed';
import { mergeGroups, type ShabadGroup } from '@/lib/feed';
import type { Word } from '@/lib/supabase';

// Gurbani view before a search: every shabad of the selected scriptures, in
// reading order (kosh sources.rank), 20 at a time.
export function ShabadFeed({ sources }: { sources?: number[] }) {
  const qs = new URLSearchParams();
  [...(sources ?? [])].sort((a, b) => a - b).forEach(s => qs.append('source', String(s)));
  const feed = useCursorFeed<ShabadGroup>(
    `/api/feed/shabads?${qs}`,
    page => (page.shabads as ShabadGroup[]) ?? [],
    mergeGroups,
  );
  return (
    <InfiniteList
      items={feed.items}
      getKey={g => `${g.key}:${g.lines[0].id}`}
      renderItem={g => <ShabadCard group={g} />}
      hasMore={feed.hasMore}
      loading={feed.loading}
      error={feed.error}
      onLoadMore={feed.loadMore}
      estimateSize={150}
    />
  );
}

// Dictionary view before a search: every word, most frequent first.
export function WordFeed() {
  const feed = useCursorFeed<Word>('/api/feed/words', page => (page.words as Word[]) ?? []);
  return (
    <InfiniteList
      items={feed.items}
      getKey={w => w.id}
      renderItem={w => (
        <a
          href={`/word/${encodeURIComponent(w.gurmukhi)}`}
          className="flex items-baseline gap-4 rounded-md border border-[#ddd0be] bg-white px-4 py-3 hover:bg-[#f7efe2]"
        >
          <span className="flex-1 text-2xl text-[#1a1008]" style={{ fontFamily: '"Noto Sans Gurmukhi", serif' }}>{w.gurmukhi}</span>
          <span className="shrink-0 rounded-full bg-[#f0e4d0] px-2 py-0.5 text-xs text-[#7a6045]" title="occurrences">
            {w.frequency.toLocaleString()}×
          </span>
        </a>
      )}
      hasMore={feed.hasMore}
      loading={feed.loading}
      error={feed.error}
      onLoadMore={feed.loadMore}
      estimateSize={58}
      gap={8}
    />
  );
}
