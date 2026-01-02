import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CafePOS',
    short_name: 'CafePOS',
    description: 'Offline-first cafe and restaurant point of sale',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f1e7',
    theme_color: '#356c4f',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
