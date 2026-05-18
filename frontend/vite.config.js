import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      // Proxy API and auth requests to backend to keep same-origin for cookies
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        // here we rewrite the path to remove the 
        // /api prefix before forwarding to backend
        // allowing us to keep the same API paths in frontend code
        // /^\/api/ matches any path that starts with
        // /api and rewrites it to remove the /api prefix
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

