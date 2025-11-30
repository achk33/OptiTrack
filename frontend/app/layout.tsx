import './globals.css'
import React from 'react'
import { Navigation } from '../components/navigation'
import { Providers } from '../components/providers'
import { SessionMonitor } from '../components/session-monitor'
import { ErrorBoundary } from '../components/error-boundary'

export const metadata = { 
  title: 'OptiTrack - Asset Management',
  icons: {
    icon: '/favicon.ico',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <ErrorBoundary>
          <Providers>
            <SessionMonitor />
            <Navigation />
            <main className="pt-16 lg:pt-0 min-h-screen">
              {children}
            </main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
