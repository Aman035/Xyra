import type React from 'react'
import type { Metadata } from 'next'
import { Space_Grotesk, DM_Sans } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import Header from '@/components/header'
import { ToastProvider } from '@/components/ui/toast'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Universal Lending Protocol',
  description: 'Empower Your Financial Future - Lend. Borrow. Grow.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}
    >
      <body className="font-sans">
        <Providers>
          <ToastProvider>
            <div className="min-h-screen bg-gray-950">
              <Header />
              {children}
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  )
}
