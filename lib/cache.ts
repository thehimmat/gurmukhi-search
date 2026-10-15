// Results only change when the corpus is re-ingested, so successful responses
// are cached at the CDN for a day and served stale for a week while one
// refreshes. Browsers don't cache them, so a re-ingest shows within a day.
export const CDN_CACHE = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';
export const NO_STORE = 'no-store';
