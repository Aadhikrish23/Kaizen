import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Authenticated GET API calls: network first with a short timeout, small and short-lived cache. Auth, admin,
        // health and the reminders poll are never cached; the cache is also cleared on login and logout (offline/apiCache.ts)
        // so one user's responses are never shown to another.
        runtimeCaching: [
          {
            urlPattern: ({ url, request }: { url: URL; request: Request }) =>
              request.method === 'GET' &&
              url.pathname.includes('/api/v1/') &&
              !/\/api\/v1\/(auth|admin|health|reminders\/due)(\/|$|\?)/.test(url.pathname + url.search),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kaizen-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Kaizen Health',
        short_name: 'Kaizen',
        description: 'Personal Health Operating System',
        theme_color: '#0C0E14',
        background_color: '#0C0E14',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
