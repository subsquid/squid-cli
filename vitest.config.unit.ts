import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 10_000,
    include: ['src/**/*.unit.spec.ts'],
    globals: false,
  },
});
