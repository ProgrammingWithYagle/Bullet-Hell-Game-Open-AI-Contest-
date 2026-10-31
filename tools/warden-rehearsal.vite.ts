import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  publicDir: false,
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1800,
    outDir: "tmp/warden-rehearsal-build",
    emptyOutDir: true,
    rolldownOptions: { input: "tools/warden-rehearsal.html" },
  },
});
