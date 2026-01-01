import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'CafePOS',
  description: 'Offline-first point of sale for cafes and restaurants',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
