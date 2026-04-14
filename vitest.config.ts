import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30_000,
    include: ['src/**/*.unit.spec.ts', 'src/**/*.e2e.spec.ts'],
    globals: false,
  },
});
