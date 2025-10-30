"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { setAuthToken } from './api'

type Role = 'Admin' | 'Technicien' | 'Lecteur'

export type AppUser = {
  id: string
  role: Role
  email: string
  name: string
}

type AuthState = {
  token: string | null
  user: AppUser | null
}

function readAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { token: null, user: null }
  }
  const token = window.localStorage.getItem('token')
  const rawUser = window.localStorage.getItem('user')
  let user: AppUser | null = null
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as AppUser
      if (parsed && parsed.id && parsed.role) {
        // Ensure role is valid, default to Lecteur if undefined
        user = {
          ...parsed,
          role: parsed.role || 'Lecteur'
        }
      }
    } catch {
      user = null
    }
  }
  return { token, user }
}

export function setAuthState(token: string | null, user: AppUser | null) {
  if (typeof window === 'undefined') return
  if (token) window.localStorage.setItem('token', token)
  else window.localStorage.removeItem('token')
  if (user) window.localStorage.setItem('user', JSON.stringify(user))
  else window.localStorage.removeItem('user')
  window.dispatchEvent(new Event('auth:changed'))
}

export function useAuthState() {
  // Start with null to match SSR, will sync from localStorage in useEffect
  const [state, setState] = useState<AuthState>({ token: null, user: null })
  const [hydrated, setHydrated] = useState(false)

  // Don't call setAuthToken here - it will be set by api.ts module initialization
  // This effect only updates if the token changes after hydration
  useEffect(() => {
    if (hydrated) {
      setAuthToken(state.token || undefined)
    }
  }, [state.token, hydrated])

  const sync = useCallback(() => {
    const next = readAuthState()
    console.log('🔄 Syncing auth state:', { 
      hasToken: !!next.token, 
      hasUser: !!next.user,
      userName: next.user?.name 
    })
    setState(next)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    sync()
    const handleStorage = () => sync()
    const handleAuthChanged = () => sync()
    const handleFocus = () => sync()
    window.addEventListener('storage', handleStorage)
    window.addEventListener('auth:changed', handleAuthChanged)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('auth:changed', handleAuthChanged)
      window.removeEventListener('focus', handleFocus)
    }
  }, [sync])

  const isAuthenticated = useMemo(() => !!state.token && !!state.user, [state.token, state.user])

  return { ...state, isAuthenticated, hydrated }
}
