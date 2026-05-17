import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Proxy API and auth requests to backend to keep same-origin for cookies
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
      }
    }
  }
}))

