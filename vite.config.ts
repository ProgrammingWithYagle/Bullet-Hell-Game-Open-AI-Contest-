import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/dist/**', '**/output/**', '**/reviews/**', '**/.wiki-checkout/**'] },
  },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 1800 },
  worker: { format: 'es' },
  publicDir: false,
});
