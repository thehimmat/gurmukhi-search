// Compiles a user-facing pattern string to a PostgreSQL regex.
//
// Pattern syntax:
//   Plain Gurmukhi chars   → literal match
//   _                      → any single Unicode codepoint (.)
//   *                      → any sequence of codepoints (.*)
//   {categoryName}         → any character from the named semi-wildcard category
//   (a|b|c)                → alternation
//
// Diacritic-only input:
//   If the pattern starts with (or consists only of) a combining diacritic,
//   it is automatically prefixed with [anyBaseChar] so the search is valid.
//
// The output is a PostgreSQL-compatible regex string (not anchored by default).

import { CHAR_CATEGORIES, isCombiningMark, BASE_CHARS } from './gurmukhi-chars';

// Escape a single character for use inside a PostgreSQL regex character class [...].
function escapeForClass(ch: string): string {
  // Characters that are special inside [...]: ] \ ^ -
  return ch.replace(/[\]\\^-]/g, '\\$&');
}

// Escape a single character for use in a PostgreSQL regex (outside a class).
function escapeRegex(ch: string): string {
  return ch.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
}

// Build a PostgreSQL regex character class [...] from an array of chars.
function buildClass(chars: string[]): string {
  const inner = chars.map(escapeForClass).join('');
  return `[${inner}]`;
}

// The base-character class used when a lone diacritic is the leading token.
const ANY_BASE_CLASS = buildClass([...BASE_CHARS]);

// Token types produced by the tokenizer.
type Token =
  | { type: 'literal'; value: string }   // plain Gurmukhi codepoints
  | { type: 'any_char' }                 // _
  | { type: 'any_seq' }                  // *
  | { type: 'category'; name: string }   // {name}
  | { type: 'group_open' }               // (
  | { type: 'group_close' }              // )
  | { type: 'alternation' }              // |

function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < pattern.length) {
    // {category}
    if (pattern[i] === '{') {
      const end = pattern.indexOf('}', i);
      if (end === -1) throw new Error('Unclosed { in pattern');
      const name = pattern.slice(i + 1, end);
      if (!CHAR_CATEGORIES[name]) throw new Error(`Unknown category: ${name}`);
      tokens.push({ type: 'category', name });
      i = end + 1;
      continue;
    }

    if (pattern[i] === '_') { tokens.push({ type: 'any_char' }); i++; continue; }
    if (pattern[i] === '*') { tokens.push({ type: 'any_seq' }); i++; continue; }
    if (pattern[i] === '(') { tokens.push({ type: 'group_open' }); i++; continue; }
    if (pattern[i] === ')') { tokens.push({ type: 'group_close' }); i++; continue; }
    if (pattern[i] === '|') { tokens.push({ type: 'alternation' }); i++; continue; }

    // Unicode codepoint (handles multi-byte chars and combining marks correctly)
    const cp = pattern.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    tokens.push({ type: 'literal', value: ch });
    i += ch.length;
  }

  return tokens;
}

// Convert tokens to a PostgreSQL regex fragment.
// Handles the diacritic-prefix rule: a lone combining mark gets a base-char class prepended.
function tokensToRegex(tokens: Token[]): string {
  let result = '';
  let prevWasBase = false; // track whether last emitted thing was a base-char match

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    switch (tok.type) {
      case 'literal': {
        const isMark = isCombiningMark(tok.value);
        if (isMark && !prevWasBase) {
          // Lone diacritic: prepend a base-char class
          result += ANY_BASE_CLASS;
        }
        result += escapeRegex(tok.value);
        prevWasBase = !isMark;
        break;
      }
      case 'any_char':
        result += '.';
        prevWasBase = true; // treat wildcard as potential base
        break;
      case 'any_seq':
        result += '.*';
        prevWasBase = true;
        break;
      case 'category': {
        const chars = CHAR_CATEGORIES[tok.name];
        const allAreDiacritics = chars.every(isCombiningMark);
        if (allAreDiacritics && !prevWasBase) {
          result += ANY_BASE_CLASS;
        }
        result += buildClass(chars);
        prevWasBase = !allAreDiacritics;
        break;
      }
      case 'group_open':
        result += '(';
        prevWasBase = false;
        break;
      case 'group_close':
        result += ')';
        prevWasBase = true;
        break;
      case 'alternation':
        result += '|';
        prevWasBase = false;
        break;
    }
  }

  return result;
}

export type CompileResult =
  | { ok: true; regex: string }
  | { ok: false; error: string };

// Compile a user pattern to a PostgreSQL regex string.
// Returns an error object if the pattern is invalid.
export function compilePattern(pattern: string): CompileResult {
  if (!pattern.trim()) return { ok: false, error: 'Empty pattern' };
  try {
    const tokens = tokenize(pattern.trim());
    const regex = tokensToRegex(tokens);
    return { ok: true, regex };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Returns a human-readable description of available categories for display.
export function listCategories(): { name: string; chars: string[] }[] {
  return Object.entries(CHAR_CATEGORIES).map(([name, chars]) => ({ name, chars }));
}
