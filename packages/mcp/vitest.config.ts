import { defineConfig } from 'vitest/config';

/** Per-package config, discovered by the root's `projects` glob. Plain Node, no plugins needed. */
export default defineConfig({
  test: {
    name: 'mcp',
    include: ['test/**/*.{test,spec}.ts'],
    environment: 'node',
    // Keeps loadAuthToken off the developer home directory. The server, the follower and the
    // test hellos all read this same value.
    env: { FIGWRIGHT_TOKEN: 'figwright-test-token' },
  },
});
