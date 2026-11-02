import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

import pkg from '../mcp/package.json' with { type: 'json' };
import { localAuthToken } from '../mcp/src/auth-token.js';

// Single product version, sourced from the published package (@figwright/mcp).
const { version } = pkg;

export default defineConfig({
  root: 'ui',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    // Baked at build time from ~/.figwright/auth-token (or FIGWRIGHT_TOKEN). dist/ is gitignored.
    // A plugin built on another machine will not match this machine's server.
    __FIGWRIGHT_AUTH_TOKEN__: JSON.stringify(localAuthToken()),
  },
  plugins: [vue(), tailwindcss(), viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: false,
    target: 'baseline-widely-available',
    rollupOptions: {
      input: 'ui/index.html',
    },
  },
});
