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

// ─── Kosh / dictionary types ──────────────────────────────────────────────────

export type Word = {
  id: number;
  gurmukhi: string;
  frequency: number;
};

export type DictSource = {
  id: number;
  code: string;
  name: string;
  language: string | null;
  url: string | null;
  notes: string | null;
};

export type Definition = {
  id: number;
  word_id: number;
  dict_source_id: number;
  entry_gurmukhi: string | null;
  sense_number: number | null;
  definition_text: string;
  definition_en: string | null;
  cross_refs: Record<string, string> | null;
  source_url: string | null;
  notes: string | null;
};

export type DefinitionWithSource = Definition & {
  dict_sources: DictSource | null;
};

export type Etymology = {
  id: number;
  word_id: number;
  order_index: number;
  origin_language: string;
  root_form: string | null;
  root_form_roman: string | null;
  derivation_note: string | null;
  source_text: string | null;
};

export type WordGrammar = {
  id: number;
  word_id: number;
  definition_id: number | null;
  pos: string | null;
  gender: string | null;
  number: string | null;
  gram_case: string | null;
  notes: string | null;
};

export type WordForm = {
  id: number;
  lexeme_id: number;
  word_id: number;
  inflection_desc: string | null;
};
