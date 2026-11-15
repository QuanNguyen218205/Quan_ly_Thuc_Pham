import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@food-mgmt/shared-sim': path.resolve(rootDir, 'shared-sim/src/index.ts'),
      '@food-mgmt/desktop-server': path.resolve(rootDir, 'desktop-server/src'),
      '@food-mgmt/mobile-client': path.resolve(rootDir, 'mobile-client/src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}', 'shared-sim/**/*.test.ts'],
    globals: false,
    passWithNoTests: false,
  },
});
