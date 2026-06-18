import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'IDKstream',
        short_name: 'IDKstream',
        description: 'Anti-algorithmic streaming. Random global live TV.',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'any',
        categories: ['entertainment', 'lifestyle'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Runtime caching for iptv-org API
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/iptv-org\.github\.io\/api\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'iptv-org-api-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
        // Do NOT precache media streams
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\.m3u8$/, /\.ts$/],
      },
    }),
  ],
})
