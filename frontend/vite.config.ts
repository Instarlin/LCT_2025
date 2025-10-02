import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteCommonjs(),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser'], 
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: ["@icr/polyseg-wasm"],
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['zomba-3d.instarlin.com'],
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL ?? 'http://localhost:8000',
        rewrite: (p) => p.replace(/^\/api/, ''),
        ws: true,
        // changeOrigin: true,
      },
    },
  },
})
