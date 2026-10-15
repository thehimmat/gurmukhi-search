import type { CorpusFacet, RaagFacet, WriterFacet } from './supabase';

export type Meta = { raags: RaagFacet[]; writers: WriterFacet[]; corpora: CorpusFacet[] };

// Loads the filter dropdown options. /api/meta can 503 on a cold start (it
// refuses to serve an incomplete facet list), which used to leave the Filters
// dropdowns empty for the whole visit, so one failure is retried after a pause.
export async function fetchMeta(
  fetchFn: (url: string) => Promise<Response> = fetch,
  { retries = 1, delayMs = 1500 }: { retries?: number; delayMs?: number } = {},
): Promise<Meta> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchFn('/api/meta');
      if (!res.ok) throw new Error(`/api/meta ${res.status}`);
      return (await res.json()) as Meta;
    } catch (e) {
      if (attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
