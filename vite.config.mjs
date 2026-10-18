import {defineConfig} from 'vite';

export default defineConfig({
  publicDir: process.env.YANGYANG_PUBLIC_DIR || 'public',
  build: {outDir: process.env.YANGYANG_DIST_DIR || 'dist'},
  server: {
    watch: {
      // Running Windows executables cannot be watched. Keep development focused
      // on source and public assets while preserving immutable delivery files.
      ignored: ['**/deliveries/**', '**/work/**', '**/art/**', '**/docs/evidence/**', '**/src-tauri/target/**'],
    },
  },
});
