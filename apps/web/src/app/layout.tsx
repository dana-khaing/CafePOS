import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { LocaleProvider } from '@/components/locale-provider'

import './globals.css'

export const metadata: Metadata = {
  title: 'CafePOS',
  description: 'Offline-first point of sale for cafes and restaurants',
  applicationName: 'CafePOS',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CafePOS',
  },
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <LocaleProvider>{children}</LocaleProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
