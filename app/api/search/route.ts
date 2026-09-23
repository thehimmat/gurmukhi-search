import { NextRequest, NextResponse } from 'next/server';
import {
  searchContains,
  searchFirstLetters,
  searchPattern,
  searchLetterSet,
  searchNumbers,
  WordViewOptions,
  PAGE_SIZE,
} from '@/lib/search';
import { isNumericQuery, parseNumericQuery } from '@/lib/numbers';
import { SearchFilters } from '@/lib/supabase';
import { LetterSetQuery, ExtraMode, Scope, VowelMode, WordSort, FilterMode } from '@/lib/letterset';

export const runtime = 'nodejs';

// Parse the structured Letter Set query out of the request params.
function parseLetterSet(sp: URLSearchParams): LetterSetQuery {
  const splitChars = (s: string) => [...s].filter((c) => c.trim().length > 0);
  return {
    letters: (sp.get('letters') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    repeat: sp.get('repeat') !== '0',
    extra: (sp.get('extra') as ExtraMode) ?? 'none',
    wildcardSlots: Math.max(1, Math.min(3, parseInt(sp.get('slots') ?? '2', 10))),
    vowelMode: (sp.get('vmode') as VowelMode) ?? 'any',
    vowels: {
      mukta: sp.get('mukta') !== '0',
      signs: splitChars(sp.get('vsigns') ?? ''),
    },
    requireAllConsonants: sp.get('reqcons') === '1',
    requireAllVowels: sp.get('reqvowels') === '1',
    allowNasalAddak: sp.get('nasal') !== '0',
    scope: (sp.get('scope') as Scope) ?? 'word',
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const mode = sp.get('mode') ?? 'contains'; // contains | first_letter | pattern | letterset
  const query = sp.get('q') ?? '';
  const page = Math.max(0, parseInt(sp.get('page') ?? '0', 10));
  const scope: Scope = sp.get('scope') === 'word' ? 'word' : 'line';

  // Multi-select facets arrive as repeated params (raag=a&raag=b). A single
  // value still works, so existing links keep resolving.
  const list = (key: string) =>
    sp.getAll(key).flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);
  const writers = list('writer');
  const raags = list('raag');
  const sources = list('source').map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n));

  // Number roles arrive the same repeated-param way as the other facets.
  // `list` strips the empty value, so `numrole=` arrives here as [] — which
  // means "show nothing" — while an absent param stays undefined and picks up
  // the heading defaults. Presence, not length, is what separates the two.
  const numberRoles = sp.has('numrole') ? list('numrole') : undefined;

  const filters: SearchFilters = {
    raags: raags.length ? raags : undefined,
    writers: writers.length ? writers : undefined,
    sources: sources.length ? sources : undefined,
    angMin: sp.has('ang_min') ? parseInt(sp.get('ang_min')!, 10) : undefined,
    angMax: sp.has('ang_max') ? parseInt(sp.get('ang_max')!, 10) : undefined,
    numberRoles,
  };

  const view: WordViewOptions = {
    sort: (sp.get('sort') as WordSort) ?? undefined,
    filter: sp.get('filter') ?? undefined,
    filterMode: (sp.get('fmode') as FilterMode) ?? undefined,
  };

  let result;
  if (mode === 'letterset') {
    result = await searchLetterSet(parseLetterSet(sp), filters, page, view);
  } else if (mode === 'first_letter') {
    result = await searchFirstLetters(query, filters, page);
  } else if (mode === 'pattern') {
    result = await searchPattern(query, filters, page, scope);
  } else {
    if (!query.trim()) {
      return NextResponse.json({ lines: [], total: 0, page, pageSize: PAGE_SIZE });
    }
    // A bare number is a question about where it appears and in what capacity,
    // which a substring match cannot answer: ੧ occurs in ~7,200 verse tallies.
    const value = isNumericQuery(query) ? parseNumericQuery(query) : null;
    result = value !== null
      ? await searchNumbers(value, filters, page)
      : await searchContains(query, filters, page);
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    lines: result.lines,
    words: result.words ?? null,
    total: result.total,
    hasMore: result.hasMore ?? null,
    numberRoles: result.numberRoles ?? null,
    page,
    pageSize: PAGE_SIZE,
  });
}
