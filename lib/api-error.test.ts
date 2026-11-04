import { describe, it, expect, vi } from 'vitest';
import { dbErrorResponse, badInput, isTimeout, MAX_QUERY_LENGTH, ERROR_TEXT } from './api-error';

describe('isTimeout', () => {
  it('spots Postgres statement timeouts by code or message', () => {
    expect(isTimeout({ message: 'x', code: '57014' })).toBe(true);
    expect(isTimeout({ message: 'canceling statement due to statement timeout' })).toBe(true);
    expect(isTimeout({ message: 'relation "x" does not exist', code: '42P01' })).toBe(false);
  });
});

describe('dbErrorResponse', () => {
  const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

  it('answers a timeout with 504 and friendly text, never the raw message', async () => {
    const log = quiet();
    const res = dbErrorResponse({ message: 'canceling statement due to statement timeout', code: '57014' }, 'search');
    expect(res.status).toBe(504);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toEqual({ error: ERROR_TEXT.timeout, code: 'timeout' });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('answers any other database failure with 500 and friendly text', async () => {
    const log = quiet();
    const res = dbErrorResponse({ message: 'permission denied for function x' }, 'search');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: ERROR_TEXT.unavailable, code: 'unavailable' });
    expect(JSON.stringify(body)).not.toContain('permission');
    log.mockRestore();
  });

  it('can answer 503 for a dependency that is down rather than broken', async () => {
    const log = quiet();
    expect(dbErrorResponse({ message: 'x' }, 'feed', 503).status).toBe(503);
    log.mockRestore();
  });
});

describe('badInput', () => {
  it('answers 400 with the given message, uncached', async () => {
    const res = badInput('Query is too long.');
    expect(res.status).toBe(400);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ error: 'Query is too long.', code: 'bad_input' });
  });

  it('caps queries at about 200 characters', () => {
    expect(MAX_QUERY_LENGTH).toBe(200);
  });
});
