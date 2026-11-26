import { defineConfig } from 'vite';
const audience=process.env.VITE_GAME_AUDIENCE??'testing';
if(!['testing','public'].includes(audience))throw Error('Unsupported game audience');
export default defineConfig({
  base: './',
  define: {'__GA_TESTING_BUILD__':JSON.stringify(audience==='testing')},
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/dist/**', '**/dist-public/**', '**/output/**', '**/reviews/**', '**/.wiki-checkout/**'] },
  },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 1800 },
  worker: { format: 'es' },
  publicDir: false,
});
