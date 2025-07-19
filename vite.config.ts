import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/cors-proxy-atmel': {
        target: 'http://packs.download.atmel.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/cors-proxy-atmel/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Atmel proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Atmel Request to the Target:', req.method, req.url);
          });
        },
      },
      '/cors-proxy-microchip': {
        target: 'https://packs.download.microchip.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/cors-proxy-microchip/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Microchip proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Microchip Request to the Target:', req.method, req.url);
          });
        },
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
