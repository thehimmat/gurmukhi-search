'use client';

import { createContext, useContext, useMemo } from 'react';
import { defaultSourceIds, type SourceInfo } from '@/lib/sources';

// kosh's sources, loaded on the server (app/page.tsx) so the first render already knows the
// scriptures and the default selection.
type Sources = { sources: SourceInfo[]; defaults: number[] };

const SourcesContext = createContext<Sources>({ sources: [], defaults: [] });

export function SourcesProvider({ sources, children }: { sources: SourceInfo[]; children: React.ReactNode }) {
  const value = useMemo(() => ({ sources, defaults: defaultSourceIds(sources) }), [sources]);
  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

export function useSources(): Sources {
  return useContext(SourcesContext);
}
