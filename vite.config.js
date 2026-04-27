import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Admin-only heavy deps
          if (id.includes('recharts') || id.includes('d3-')) return 'admin-charts'
          if (id.includes('remotion') || id.includes('@remotion')) return 'remotion'
          if (id.includes('xlsx') || id.includes('file-saver')) return 'admin-export'
          if (id.includes('@faker-js')) return 'faker'
          if (id.includes('react-slick') || id.includes('slick-carousel')) return 'carousel'
          if (id.includes('qrcode')) return 'qrcode'
          // Core vendor split
          if (id.includes('node_modules/react-dom')) return 'react-dom'
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'react-core'
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    },
    // Warn when chunks exceed 500kb
    chunkSizeWarningLimit: 500,
  },
  // Optimize deps pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'recharts', 'es-toolkit/compat', 'file-saver'],
    exclude: ['xlsx'],
  },
})
