// localStorage that never throws. Safari private mode, some in-app webviews and
// blocked site data throw on access, which used to crash the page during render
// (#49). A preference that can't be read or saved just falls back to its default.
export function safeGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Not saved; the choice still applies for this visit.
  }
}
