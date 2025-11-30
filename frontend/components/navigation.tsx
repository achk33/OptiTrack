'use client'

import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './auth-context'
import { Button } from './ui/button'
import { RoleBadge } from './ui/badge'
import { Menu, X, Shield, BarChart3, Package, Upload, Database, Users, Activity, ChevronLeft, LogOut, User, Briefcase, ClipboardList, Calendar, Settings } from 'lucide-react'
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
    href: '/workorders', 
    label: 'Ordres de travail', 
    icon: Briefcase,
    roles: ['Admin', 'Technicien'],
    description: 'Gestion des tâches et interventions'
  },
  { 
    href: '/pmplans', 
    label: 'Plans PM', 
    icon: Calendar,
    roles: ['Admin', 'Technicien'],
    description: 'Maintenance préventive'
  },
  { 
    href: '/users', 
    label: 'Utilisateurs', 
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
    label: 'Audit', 
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
    label: 'Qualité', 
    icon: Database,
    roles: ['Admin'],
    description: 'Analyse et contrôle qualité des données'
  }
]

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout, hydrated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Update CSS variable for sidebar width
  useEffect(() => {
    const sidebarWidth = sidebarCollapsed ? '80px' : '280px'
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth)
  }, [sidebarCollapsed])

  const handleLogout = useCallback(async () => {
    router.push('/login')
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

  const getDisplayName = () => {
    if (!user) return 'User'
    return user.name || user.email || 'User'
  }

  const getAvatarInitial = () => {
    if (!user) return 'U'
    return (user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
  }

  return (
    <>
      {/* Top Bar - Mobile Only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-6 w-6 text-slate-700" />
        </button>
        <div className="ml-4 flex-1">
          <h1 className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
            OptiTrack
          </h1>
        </div>
        {hydrated && isAuthenticated && user && (
          <Link href="/profile" className="flex items-center space-x-2">
            <div className="h-9 w-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">{getAvatarInitial()}</span>
            </div>
          </Link>
        )}
      </div>

      {/* Backdrop - Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Vertical Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-slate-200 z-50 flex flex-col shadow-xl transition-all duration-300",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed ? "lg:w-20" : "lg:w-[280px]",
          "w-[280px]"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          {!sidebarCollapsed ? (
            <Link href="/" className="flex items-center space-x-3 group">
              <img 
                src="/Logo.png" 
                alt="OptiTrack Logo" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent">
                  OptiTrack
                </h1>
                <p className="text-xs text-slate-500">Asset Management</p>
              </div>
            </Link>
          ) : (
            <Link href="/" className="flex items-center justify-center w-full group">
              <img 
                src="/Logo.png" 
                alt="OptiTrack Logo" 
                className="h-10 w-10 object-contain"
              />
            </Link>
          )}
          
          {/* Collapse Button - Desktop Only */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn(
              "h-5 w-5 text-slate-600 transition-transform",
              sidebarCollapsed && "rotate-180"
            )} />
          </button>

          {/* Close Button - Mobile Only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* User Profile Section */}
        {hydrated && isAuthenticated && user && (
          <div className="p-4 border-b border-slate-200">
            <Link
              href="/profile"
              className={cn(
                "flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-all group",
                sidebarCollapsed && "justify-center"
              )}
            >
              <div className="h-10 w-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-transparent group-hover:ring-brand-200 transition-all">
                <span className="text-sm font-bold text-white">{getAvatarInitial()}</span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{getDisplayName()}</p>
                  <RoleBadge role={user.role || 'Lecteur'} className="text-xs mt-1" />
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {hydrated && isAuthenticated && filteredLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30"
                    : "text-slate-600 hover:bg-slate-50 hover:text-brand-600",
                  sidebarCollapsed && "justify-center px-2"
                )}
                title={sidebarCollapsed ? link.label : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-brand-600"
                )} />
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{link.label}</p>
                    {link.description && !isActive && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {link.description}
                      </p>
                    )}
                  </div>
                )}
                {isActive && !sidebarCollapsed && (
                  <div className="w-1 h-8 bg-white rounded-full absolute right-2" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-slate-200 p-4 space-y-2">
          {hydrated && isAuthenticated ? (
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? "Déconnexion" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Déconnexion</span>}
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-all",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? "Connexion" : undefined}
            >
              <User className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Connexion</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
