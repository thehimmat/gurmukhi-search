import { describe, it, expect } from 'vitest';
import { responseError, thrownError, FALLBACK_TEXT } from './client-errors';
import { ERROR_TEXT } from './error-text';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('responseError', () => {
  it('uses the server-provided message', async () => {
    expect(await responseError(json(400, { error: 'Query is too long.', code: 'bad_input' }))).toBe('Query is too long.');
  });
  it('falls back by status when the body is not JSON', async () => {
    expect(await responseError(new Response('<html>Bad gateway</html>', { status: 502 }))).toBe(FALLBACK_TEXT.server);
    expect(await responseError(new Response('', { status: 504 }))).toBe(ERROR_TEXT.timeout);
  });
});

describe('thrownError', () => {
  it('reads a failed fetch as being offline', () => {
    expect(thrownError(new TypeError('Failed to fetch'))).toBe(FALLBACK_TEXT.offline);
  });
  it('keeps an Error message it already made friendly', () => {
    expect(thrownError(new Error('Query is too long.'))).toBe('Query is too long.');
  });
  it('never shows a JSON parse error', () => {
    expect(thrownError(new SyntaxError('Unexpected token < in JSON'))).toBe(FALLBACK_TEXT.server);
  });
});
