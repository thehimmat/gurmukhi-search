import { NextResponse } from 'next/server';
import { NO_STORE } from './cache';
import { ERROR_TEXT } from './error-text';

// What an API route sends when something goes wrong. Database messages
// ("canceling statement due to statement timeout") are logged here and never
// shown: readers get a sentence they can act on, and the client gets a code.
export type ApiErrorCode = 'timeout' | 'unavailable' | 'bad_input';
export type DbError = { message: string; code?: string };

export const MAX_QUERY_LENGTH = 200;

export { ERROR_TEXT };

// Postgres query_canceled (57014) is what a statement_timeout raises.
export function isTimeout(e: DbError): boolean {
  return e.code === '57014' || /statement timeout/i.test(e.message);
}

export function dbErrorResponse(e: DbError, context: string, status = 500): NextResponse {
  console.error(`[${context}]`, e.code ?? '', e.message);
  const timeout = isTimeout(e);
  return NextResponse.json(
    { error: timeout ? ERROR_TEXT.timeout : ERROR_TEXT.unavailable, code: timeout ? 'timeout' : 'unavailable' },
    { status: timeout ? 504 : status, headers: { 'Cache-Control': NO_STORE } },
  );
}

export function badInput(message: string): NextResponse {
  return NextResponse.json({ error: message, code: 'bad_input' }, { status: 400, headers: { 'Cache-Control': NO_STORE } });
}

export const TOO_LONG = `That's too long to search. Keep it under ${MAX_QUERY_LENGTH} characters.`;
