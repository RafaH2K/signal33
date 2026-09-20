import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // HTTPS con certificado propio en desarrollo: sin él, un celular que entre
    // por la IP de la red no puede usar la cámara (los navegadores sólo dan
    // acceso en sitios seguros, y localhost es la única excepción).
    command === 'serve' && basicSsl(),
  ].filter(Boolean),
  server: {
    // escucha en toda la red local para poder probar desde el celular
    host: true,
    // así el sitio y la API comparten origen y el celular no necesita conocer
    // la dirección del backend ni lidiar con CORS
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
    },
  },
}))
