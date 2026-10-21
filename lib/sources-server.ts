import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { SourceInfo } from './sources';

/** kosh's sources in reading order. Throws on an error or an empty table, so a page never renders without them. */
export async function loadSources(db: Pick<SupabaseClient, 'from'> = supabase): Promise<SourceInfo[]> {
  const { data, error } = await db
    .from('sources')
    .select('id, slug, name, rank, page_unit, searched_by_default')
    .order('rank', { ascending: true });
  if (error) throw new Error(`sources: ${error.message}`);
  const rows = (data ?? []) as Array<{ id: number; slug: string; name: string; page_unit: string; searched_by_default: boolean }>;
  if (!rows.length) throw new Error('sources: no sources');
  return rows.map((r) => ({
    id: Number(r.id), slug: r.slug, name: r.name, pageUnit: r.page_unit, searchedByDefault: r.searched_by_default,
  }));
}

/** loadSources once per render, shared by the layout and the page. */
export const getSources = cache(() => loadSources());
