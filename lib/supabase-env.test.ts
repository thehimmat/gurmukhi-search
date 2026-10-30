// On the VM (gurmukhi-kosh selfhost/docker-compose.apps.yml) the server reaches the API over Docker's
// network, read at runtime; NEXT_PUBLIC_ values are inlined at build time and stay the fallback
// (Vercel, local dev). Only server code queries the database (client-imports.test.ts).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabaseAnonKey, supabaseUrl } from './supabase';

afterEach(() => vi.unstubAllEnvs());

describe('database env', () => {
  it('prefers the runtime SUPABASE_URL and SUPABASE_ANON_KEY', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://api.example.org');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'built-in');
    vi.stubEnv('SUPABASE_URL', 'http://gateway:8080');
    vi.stubEnv('SUPABASE_ANON_KEY', 'rotated');
    expect(supabaseUrl()).toBe('http://gateway:8080');
    expect(supabaseAnonKey()).toBe('rotated');
  });

  it('falls back to the public values', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://api.example.org');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'built-in');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(supabaseUrl()).toBe('https://api.example.org');
    expect(supabaseAnonKey()).toBe('built-in');
  });
});
