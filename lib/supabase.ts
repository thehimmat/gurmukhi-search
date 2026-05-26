import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error('Supabase env vars not set');
    _client = createClient(url, anonKey);
  }
  return _client;
}

// Convenience alias — same interface as before.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── DB row types (matches kosh schema) ──────────────────────────────────────

export type Line = {
  id: number;
  verse_id: number;
  shabad_id: number | null;
  ang: number;
  line_no: number;
  gurmukhi: string;
  translation_en: string | null;
  transliteration_en: string | null;
};

export type Shabad = {
  id: number;
  raag_english: string | null;
  raag_gurmukhi: string | null;
  writer_english: string | null;
  writer_id: number | null;
  ang_start: number;
};

export type LineWithMeta = Line & {
  shabads: Shabad | null;
};

export type SearchFilters = {
  raag?: string;
  writer?: string;
  angMin?: number;
  angMax?: number;
};
