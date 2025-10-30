"use client"

import { useEffect, useState } from 'react'
import { useAuth } from './auth-context'
import { useRouter } from 'next/navigation'
import { AlertTriangle, X } from 'lucide-react'

/**
 * SessionMonitor component - monitors session expiration and warns users
 * 
 * This component:
 * - Decodes JWT token to check expiration time
 * - Shows warning 10 minutes before session expires
 * - Automatically logs out when session expires
 * - Provides "Reconnect Now" button for user convenience
 */
export function SessionMonitor() {
  const { isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) return

    const checkSession = () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        // Decode JWT to get expiration
        const payload = JSON.parse(atob(token.split('.')[1]))
        const expiresAt = payload.exp * 1000 // Convert to milliseconds
        const now = Date.now()
        const timeUntilExpiry = expiresAt - now
        const minutesLeft = Math.floor(timeUntilExpiry / 60000)

        setTimeLeft(minutesLeft)

        // Show warning 10 minutes before expiry
        if (minutesLeft <= 10 && minutesLeft > 0) {
          setShowWarning(true)
        } else if (minutesLeft <= 0) {
          // Session expired
          setShowWarning(false)
        }

        // Auto logout when expired
        if (timeUntilExpiry <= 0) {
          logout()
          router.push('/login')
        }
      } catch (error) {
        console.error('Failed to decode token:', error)
      }
    }

    // Check every minute
    const interval = setInterval(checkSession, 60000)
    checkSession() // Initial check

    return () => clearInterval(interval)
  }, [isAuthenticated, logout, router])

  if (!showWarning || !isAuthenticated) return null

  return (
    <div className="fixed top-20 right-4 z-50 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg max-w-md">
      <div className="flex items-start">
        <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800">Session bientôt expirée</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Votre session expirera dans {timeLeft} minute{timeLeft > 1 ? 's' : ''}. 
            Veuillez enregistrer votre travail.
          </p>
          <button
            onClick={() => {
              logout()
              router.push('/login')
            }}
            className="mt-3 text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Se reconnecter maintenant
          </button>
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="ml-3 text-yellow-400 hover:text-yellow-600 flex-shrink-0"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
