"use client"

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { api } from './api'
import { AppUser, setAuthState, useAuthState } from './useAuthState'

type LoginPayload = {
  email: string
  password: string
}

type AuthContextValue = {
  user: AppUser | null
  token: string | null
  isAuthenticated: boolean
  hydrated: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  checkSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useAuthState()
  const loginAttemptsRef = useRef(0)
  const lastLoginTimeRef = useRef(0)

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    try {
      // Rate limiting: prevent too many rapid login attempts
      const now = Date.now()
      const timeSinceLastLogin = now - lastLoginTimeRef.current
      
      if (timeSinceLastLogin < 2000 && loginAttemptsRef.current >= 3) {
        throw new Error("Trop de tentatives de connexion rapides. Veuillez patienter quelques secondes.")
      }
      
      loginAttemptsRef.current += 1
      lastLoginTimeRef.current = now
      
      // Clear old data before login to prevent conflicts
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token')
        window.localStorage.removeItem('user')
        window.sessionStorage.clear()
        
        // Small delay to ensure clearing completes
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      const res = await api.post('/auth/login', { email, password })
      setAuthState(res.data.token, res.data.user)
      
      // Reset login attempt counter on success
      loginAttemptsRef.current = 0
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Erreur de connexion'
      throw new Error(message)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
      
      if (token) {
        // Call backend logout endpoint to blacklist token
        await api.post('/auth/logout', {}, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }).catch(e => console.log('Logout API error:', e))
      }
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      // Always clear local storage even if API fails
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token')
        window.localStorage.removeItem('user')
        window.sessionStorage.clear()
        
        // Clear any remaining data
        try {
          const keys = Object.keys(window.localStorage)
          keys.forEach(key => {
            if (key.startsWith('auth_') || key.startsWith('session_')) {
              window.localStorage.removeItem(key)
            }
          })
        } catch (e) {
          console.error('Error clearing storage:', e)
        }
      }
      
      setAuthState(null, null)
    }
  }, [])

  const refresh = useCallback(async () => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
    if (!token) {
      setAuthState(null, null)
      return
    }
    try {
      const res = await api.get('/auth/me')
      const user = res.data?.user as AppUser | undefined
      setAuthState(token, user || null)
    } catch {
      setAuthState(null, null)
    }
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
      if (!token) return false
      
      const res = await api.get('/auth/check-session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      return res.data?.valid === true
    } catch {
      return false
    }
  }, [])

  const value: AuthContextValue = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    hydrated: state.hydrated,
    login,
    logout,
    refresh,
    checkSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
