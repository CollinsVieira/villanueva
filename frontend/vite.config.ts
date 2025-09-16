import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables del archivo .env según el modo (development, production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          // Usa la variable de entorno aquí
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          // Y también aquí
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})