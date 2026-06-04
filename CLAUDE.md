# Gurmukhi Search

Next.js search app for Gurbani — reads from the gurmukhi-kosh Supabase DB (same project).

## Supabase Project
- Project ID: `brczghxvpfikezsevbkh` (shared with gurmukhi-kosh)
- Region: us-west-1
- Dashboard: https://supabase.com/dashboard/project/brczghxvpfikezsevbkh

## Setup
1. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Run the DB migration once (adds search functions + index to the kosh DB):
   `supabase db push` from within gurmukhi-kosh, OR run the SQL manually:
   `psql <connection-string> -f supabase/migrations/001_search_functions.sql`
3. `npm run dev` — runs on port 3000

## Search Modes
- **Contains**: regex / substring on `lines.gurmukhi`
- **First Letter**: anagram-style — word[0] starts with letter[0], etc.
- **Pattern**: wildcards `_` `*` `{category}` on word-level text

## Shared Gurmukhi Input Package
Keyboard transliteration lives in the suite-level shared package, **not** in this app.

- Package: `@gurmukhi/input` — linked via npm workspaces from `../shared/gurmukhi-input/`
- Import: `import { useGurmukhiInput, GurmukhiInput } from '@gurmukhi/input'`
- Source files: `../shared/gurmukhi-input/` (keymap, hook, component)
- To modify the keyboard mapping: edit `../shared/gurmukhi-input/keymap.ts`
- To add the hook to a new input: `const { onKeyDown, onPaste } = useGurmukhiInput({ value, onChange })`

The `SearchBar` component uses `useGurmukhiInput` directly. Transliteration is always-on
(no toggle); pasted Gurmukhi unicode passes through untouched.

## Key Files
- `lib/gurmukhi-chars.ts` — Gurmukhi character taxonomy and semi-wildcard categories
- `lib/roman-to-gurmukhi.ts` — legacy igurbani mapping (superseded by `@gurmukhi/input`; kept for reference)
- `lib/pattern-compiler.ts` — wildcard pattern → PostgreSQL regex
- `lib/search.ts` — Supabase query builders for each mode
- `supabase/migrations/001_search_functions.sql` — `search_lines_regex` + `search_first_letters` PL/pgSQL functions

## Adding New Semi-Wildcard Categories
Edit `lib/gurmukhi-chars.ts` → `CHAR_CATEGORIES` object. The key becomes the `{categoryName}` token in pattern syntax. No other changes needed.

## Design
Warm parchment palette matching gurmukhi-kosh:
- Background: `#f5ede0` / `#fdf6ec`
- Accent: `#8b5e3c` (brown)
- Text: `#3d2b1f` / `#5c3d1e`
- Fonts: Noto Sans Gurmukhi (Gurmukhi text), Crimson Pro (body), Inter (UI)

## Part of Gurmukhi Suite
Located at `/Users/himmat/code/gurmukhi/gurmukhi-search`.
Update `../APP_INTERACTIONS.md` when new integration points are added.

## Deployment
Vercel-ready. Set env vars in Vercel dashboard before deploying:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
