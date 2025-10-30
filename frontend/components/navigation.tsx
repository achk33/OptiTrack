'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './auth-context'
import { Button } from './ui/button'
import { RoleBadge } from './ui/badge'
import { Menu, X, Shield, BarChart3, Package, Upload, Database, Users, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

type NavLink = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Array<'Admin' | 'Technicien' | 'Lecteur'>
  description?: string
}

const NAV_LINKS: NavLink[] = [
  { 
    href: '/dashboard', 
    label: 'Dashboard', 
    icon: BarChart3,
    roles: ['Admin', 'Technicien', 'Lecteur'],
    description: 'Vue d\'ensemble des KPI et métriques'
  },
  { 
    href: '/assets', 
    label: 'Actifs', 
    icon: Package,
    roles: ['Admin', 'Technicien', 'Lecteur'],
    description: 'Gestion des équipements et matériels'
  },
  { 
    href: '/users', 
    label: 'Users', 
    icon: Users,
    roles: ['Admin'],
    description: 'Gestion des utilisateurs et rôles'
  },
  { 
    href: '/activity-log', 
    label: 'Journal', 
    icon: Activity,
    roles: ['Admin'],
    description: 'Historique des actions'
  },
  { 
    href: '/admin/audit-logs', 
    label: 'Modifications Actifs', 
    icon: Database,
    roles: ['Admin'],
    description: 'Journal des modifications des actifs'
  },
  { 
    href: '/assets/import', 
    label: 'Import', 
    icon: Upload,
    roles: ['Admin'],
    description: 'Import de données depuis fichiers'
  },
  { 
    href: '/data-quality', 
    label: 'Quality', 
    icon: Database,
    roles: ['Admin'],
    description: 'Analyse et contrôle qualité des données'
  }
]

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout, hydrated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    // Redirect immediately to avoid showing empty dashboard
    router.push('/login')
    
    // Then handle logout in background
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [logout, router])

  const handleLogin = useCallback(() => {
    router.push('/login')
  }, [router])

  const filteredLinks = NAV_LINKS.filter(link => !user || link.roles.includes(user.role))

  // Helper to get display name
  const getDisplayName = () => {
    if (!user) return 'User'
    return user.name || user.email || 'User'
  }

  // Helper to get avatar initial
  const getAvatarInitial = () => {
    if (!user) return 'U'
    return (user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
  }

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-soft sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center group">
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent group-hover:from-brand-700 group-hover:to-brand-900 transition-all duration-200">
                    OptiTrack
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">Asset Management</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            {hydrated && isAuthenticated && (
              <div className="hidden lg:flex items-center space-x-2">
                {filteredLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-brand-50 text-brand-700 shadow-soft"
                        : "text-slate-600 hover:text-brand-700 hover:bg-slate-50"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      isActive ? "text-brand-600" : "text-slate-400 group-hover:text-brand-600"
                    )} />
                    <span>{link.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-brand-50 border-2 border-brand-200/50 rounded-xl -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                )
              })}
              </div>
            )}

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              {hydrated && isAuthenticated && user && (
                <Link href="/profile" className="hidden md:flex items-center space-x-3 hover:opacity-80 transition-opacity">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{getDisplayName()}</p>
                    <RoleBadge role={user.role || 'Lecteur'} className="text-xs" />
                  </div>
                  <div className="h-8 w-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center ring-2 ring-transparent hover:ring-brand-300 transition-all">
                    <span className="text-xs font-bold text-white">
                      {getAvatarInitial()}
                    </span>
                  </div>
                </Link>
              )}

              {/* Auth Buttons */}
              <div className="flex items-center space-x-2">
                {hydrated && (
                  <>
                    {isAuthenticated ? (
                      <Button
                        onClick={handleLogout}
                        variant="ghost"
                        size="sm"
                        className="hidden md:inline-flex"
                      >
                        Déconnexion
                      </Button>
                    ) : (
                      <Button
                        onClick={handleLogin}
                        size="sm"
                        className="hidden md:inline-flex"
                      >
                        Connexion
                      </Button>
                    )}
                  </>
                )}

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Mobile Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 inset-x-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-strong z-50 lg:hidden"
            >
              <div className="px-4 py-6 space-y-4">
                {/* User Info Mobile */}
                {hydrated && isAuthenticated && user && (
                  <Link 
                    href="/profile" 
                    className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="h-10 w-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {getAvatarInitial()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{getDisplayName()}</p>
                      <RoleBadge role={user.role || 'Lecteur'} className="text-xs" />
                    </div>
                  </Link>
                )}

                {/* Mobile Navigation Links */}
                {hydrated && isAuthenticated && (
                  <div className="space-y-2">
                    {filteredLinks.map((link) => {
                      const Icon = link.icon
                      const isActive = pathname === link.href
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "flex items-center space-x-3 p-4 rounded-xl transition-all duration-200",
                            isActive
                              ? "bg-brand-50 text-brand-700 border border-brand-200"
                              : "text-slate-600 hover:bg-slate-50"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className={cn(
                            "h-5 w-5",
                            isActive ? "text-brand-600" : "text-slate-400"
                          )} />
                          <div>
                            <p className="font-medium">{link.label}</p>
                            {link.description && (
                              <p className="text-xs text-slate-500 mt-1">{link.description}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Mobile Auth Button */}
                <div className="pt-4 border-t border-slate-200">
                  {hydrated && (
                    <>
                      {isAuthenticated ? (
                        <Button
                          onClick={() => {
                            handleLogout()
                            setMobileMenuOpen(false)
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          Déconnexion
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            handleLogin()
                            setMobileMenuOpen(false)
                          }}
                          className="w-full"
                        >
                          Connexion
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
