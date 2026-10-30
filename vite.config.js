import react from '@vitejs/plugin-react'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      // Igual que vercel.json en producción: /api va al backend desde el mismo sitio,
      // así la cookie de sesión funciona en desarrollo. Por defecto, el backend local.
      proxy: {
        '/api': { target: env.VITE_PROXY_API || 'http://localhost:3000', changeOrigin: true }
      }
    }
  }
})
