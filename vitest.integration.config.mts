import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Config separada dos testes unitários (vitest.config.mts): estes testes
 * exigem um Postgres real acessível (ver tests/integration/setup.ts) e
 * rodam mais devagar (recriam o banco). Não fazem parte do `npm test`
 * padrão — rodam via `npm run test:integration`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
