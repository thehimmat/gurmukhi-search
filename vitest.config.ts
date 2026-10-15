import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Mirror tsconfig's "@/*" path so route modules can be imported in tests.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
});
