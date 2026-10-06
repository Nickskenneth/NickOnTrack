import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/NickOnTrack/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'NickOnTrack',
        short_name: 'NickOnTrack',
        description: 'Personal offline workout logger',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        start_url: base,
        scope: base,
      },
    }),
  ],
})
