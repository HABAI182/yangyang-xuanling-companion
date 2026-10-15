import {defineConfig} from 'vite';

export default defineConfig({
  server: {
    watch: {
      // Running Windows executables cannot be watched. Keep development focused
      // on source and public assets while preserving immutable delivery files.
      ignored: ['**/deliveries/**', '**/art/**', '**/docs/evidence/**', '**/src-tauri/target/**'],
    },
  },
});
