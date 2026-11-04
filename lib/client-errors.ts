import { ERROR_TEXT } from './error-text';

// The browser side of lib/api-error.ts: turns a failed response or a thrown
// fetch into a sentence for the reader. A non-JSON 502 page or a dropped
// connection shouldn't surface as "Unexpected token <" or "Failed to fetch".
export const FALLBACK_TEXT = {
  server: "Something went wrong on our side. Please try again.",
  offline: "Couldn't reach the server. Check your connection and try again.",
} as const;

export async function responseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: unknown } | null;
  if (body && typeof body.error === 'string' && body.error) return body.error;
  return res.status === 504 ? ERROR_TEXT.timeout : FALLBACK_TEXT.server;
}

export function thrownError(e: unknown): string {
  if (e instanceof TypeError) return FALLBACK_TEXT.offline;
  if (e instanceof SyntaxError) return FALLBACK_TEXT.server;
  return (e as Error)?.message || FALLBACK_TEXT.server;
}
