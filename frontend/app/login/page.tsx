"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../components/auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('Admin!123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login, user } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await login({ email, password })
      // Small delay before redirect to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100))
      router.push('/dashboard')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erreur de connexion. Veuillez vérifier vos identifiants.')
      }
      
      // Clear password field on error for security
      setPassword('')
      
      // Focus on password field for better UX
      const passwordInput = document.getElementById('login-password') as HTMLInputElement
      passwordInput?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50/30">
      <form onSubmit={onSubmit} className="bg-white shadow-lg p-8 rounded-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">OptiTrack</h1>
          <p className="text-neutral-600 text-sm">
            Plateforme de gestion d'actifs
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              className="border border-neutral-300 rounded-lg w-full p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              className="border border-neutral-300 rounded-lg w-full p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>
          
          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 w-full font-medium transition-colors mt-2 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </div>
      </form>
    </main>
  )
}
