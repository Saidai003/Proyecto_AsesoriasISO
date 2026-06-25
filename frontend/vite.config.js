import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: {
    host: true, // Escucha en todas las interfaces de red (obligatorio para la nube/Docker)
    allowedHosts: true, // Permite el acceso desde cualquier dominio generado por Railway u otras plataformas
    port: 5173,
    proxy: {
      // Proxy API and auth requests to backend to keep same-origin for cookies
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
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
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
      },
      '/google-drive': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
}))