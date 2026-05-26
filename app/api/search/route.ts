import { NextRequest, NextResponse } from 'next/server';
import {
  searchContains,
  searchFirstLetters,
  searchPattern,
  PAGE_SIZE,
} from '@/lib/search';
import { SearchFilters } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const mode    = sp.get('mode') ?? 'contains';   // 'contains' | 'first_letter' | 'pattern'
  const query   = sp.get('q') ?? '';
  const page    = Math.max(0, parseInt(sp.get('page') ?? '0', 10));

  const filters: SearchFilters = {
    raag:    sp.get('raag')    ?? undefined,
    writer:  sp.get('writer')  ?? undefined,
    angMin:  sp.has('ang_min') ? parseInt(sp.get('ang_min')!, 10) : undefined,
    angMax:  sp.has('ang_max') ? parseInt(sp.get('ang_max')!, 10) : undefined,
  };

  if (!query.trim()) {
    return NextResponse.json({ lines: [], total: 0, page, pageSize: PAGE_SIZE });
  }

  let result;
  if (mode === 'first_letter') {
    result = await searchFirstLetters(query, filters, page);
  } else if (mode === 'pattern') {
    result = await searchPattern(query, filters, page);
  } else {
    result = await searchContains(query, filters, page);
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    lines: result.lines,
    total: result.total,
    page,
    pageSize: PAGE_SIZE,
  });
}
