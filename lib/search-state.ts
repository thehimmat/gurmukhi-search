// State changes for a failed Gurbani search. A failed first page is the
// search's error, and the previous query's results are cleared so they don't
// sit under it looking like answers. A failed later page is kept apart
// (loadMoreError): the results stay up and the endless list stops asking for
// more until the reader retries, instead of re-firing on every render (#48).
type Failable = {
  loading: boolean; loadingMore: boolean; error: string | null; loadMoreError: string | null;
  lines: unknown[]; words?: unknown[]; total?: number | null;
};

export function searchFailed<S extends Failable>(s: S, page: number, message: string): S {
  return page > 0
    ? { ...s, loading: false, loadingMore: false, loadMoreError: message }
    : { ...s, loading: false, loadingMore: false, error: message, loadMoreError: null, lines: [], words: [], total: 0 };
}
