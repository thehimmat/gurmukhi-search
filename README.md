# Gurmukhi Search

A multi-mode search engine for Gurbani, the sacred poetry of the Sikh Gurus. Type in Gurmukhi
(with on-the-fly keyboard transliteration) and search the full text of Sri Guru Granth Sahib
several different ways.

## Search modes

- **Contains**: substring or regular-expression match on the Gurmukhi line text.
- **First letter**: anagram-style search where each letter you type matches the first letter of
  successive words (a natural way to find a half-remembered line).
- **Pattern**: word-level wildcards (`_`, `*`) and character categories for structured,
  phonetics-aware queries.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, backed by a Postgres (Supabase) corpus of SGGS
with PL/pgSQL search functions. Gurmukhi keyboard input comes from a shared transliteration
package used across the suite.

## Run locally

```bash
cp .env.example .env.local   # add your Supabase URL + anon key
npm install
npm run dev                  # http://localhost:3000
```

---

One of a suite of Gurmukhi and Gurbani tools. More at [thehimmat.com](https://thehimmat.com).
