import SearchApp from '@/components/SearchApp';
import { SourcesProvider } from '@/components/SourcesContext';
import { getSources } from '@/lib/sources-server';

// The scriptures and the default selection come from kosh's sources table (065), so they are
// set in the database, not here. Regenerated hourly, like the facet lists (lib/cache.ts).
export const revalidate = 3600;

export default async function Home() {
  const sources = await getSources();
  return (
    <SourcesProvider sources={sources}>
      <SearchApp />
    </SourcesProvider>
  );
}
