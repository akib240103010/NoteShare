import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { verifyNoteMiddleware } from './src/api/verifyNoteMiddleware.js'

function verifyNoteApiPlugin() {
  return {
    name: 'noteshare-verify-note-api',
    configureServer(server) {
      server.middlewares.use('/api/verify-note', verifyNoteMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/verify-note', verifyNoteMiddleware);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdfjs';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    verifyNoteApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'NoteShare — Global Student Academic Notes Sharing',
        short_name: 'NoteShare',
        description: 'Access peer-verified lecture notes, exam study guides, formula sheets, and lab reports from university students worldwide.',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icons.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        mode: 'development',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'noteshare-html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'noteshare-static-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Only cache binary file assets (PDFs, images) from Supabase Storage or document attachments
            urlPattern: ({ url }) =>
              url.pathname.endsWith('.pdf') ||
              url.pathname.includes('/storage/v1/object/public/') ||
              url.pathname.includes('/storage/v1/object/authenticated/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'noteshare-notes-files',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
            },
          },
          {
            // Dynamic Supabase REST API queries (/rest/v1/) and Auth (/auth/v1/) must ALWAYS be NetworkFirst
            urlPattern: ({ url, request }) =>
              url.hostname.includes('supabase.co') &&
              (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) &&
              (!request || request.method === 'GET'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'noteshare-supabase-api',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60, // 1 hour fallback only when completely offline
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url, request }) => url.pathname.startsWith('/api/') && (!request || request.method === 'GET'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'noteshare-api-cache',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'noteshare-google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
})
