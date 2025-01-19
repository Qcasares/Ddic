import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Provide Node.js built-in polyfills
      util: 'rollup-plugin-node-polyfills/polyfills/util',
      // Add other Node.js built-ins if needed
      stream: 'rollup-plugin-node-polyfills/polyfills/stream',
      events: 'rollup-plugin-node-polyfills/polyfills/events'
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.PYTHON': JSON.stringify(''),
    'process.env.WORKER_THREADS': JSON.stringify('false')
  },
  optimizeDeps: {
    include: ['natural', 'pdfjs-dist'],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    commonjsOptions: {
      include: [/natural/, /node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      input: {
        polyfills: path.resolve(__dirname, 'src/lib/polyfills.ts'),
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          natural: ['natural']
        }
      }
    }
  }
});
