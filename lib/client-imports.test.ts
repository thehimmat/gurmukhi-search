// lib/supabase.ts creates the Supabase client on import, so a client
// component that imports a value from it ships @supabase/supabase-js to the
// browser (#38). Types are erased and fine; values must come from elsewhere.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

describe('client components', () => {
  it('import only types from lib/supabase', () => {
    const offenders = ['app', 'components']
      .flatMap(files)
      .filter((p) => /^['"]use client['"]/.test(readFileSync(p, 'utf8').trimStart()))
      .filter((p) => /import\s+(?!type\b)[^;]*from\s+['"](@\/lib|\.\.?\/(\.\.\/)*lib)\/supabase['"]/.test(readFileSync(p, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
