import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [{name:'edition-entry',transformIndexHtml:{order:'pre',handler:html=>process.env.VITE_APP_EDITION==='static'?html.replace('/src/main.ts','/src/static-main.ts'):html}}],
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
