'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-context'
import { useRouter } from 'next/navigation'
import { Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/components/api'

type ActivityLog = {
  id: number
  userId: number
  action: string
  details: string
  ipAddress: string | null
  createdAt: string
  module?: string
  entity?: string
  entityId?: string
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

export default function ActivityLogPage() {
  const { user, hydrated } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')

  const tabs = [
    { key: 'ALL', label: 'Toutes les actions', color: 'text-gray-700' },
    { key: 'LOGIN', label: 'Connexions', color: 'text-blue-700' },
    { key: 'LOGOUT', label: 'Déconnexions', color: 'text-slate-700' },
    { key: 'CREATE', label: 'Créations', color: 'text-green-700' },
    { key: 'DELETE', label: 'Suppressions', color: 'text-red-700' },
  ]

  useEffect(() => {
    // Wait for auth to hydrate before checking
    if (!hydrated) return
    
    if (!user || user.role !== 'Admin') {
      router.push('/dashboard')
      return
    }
    fetchLogs()
  }, [user, router, hydrated])

  const fetchLogs = async () => {
    try {
      const response = await api.get('/activity-logs')
      setLogs(response.data)
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Utilisateur', 'Email', 'Action', 'Détails', 'IP']
    const rows = filteredLogs.map(log => [
      new Date(log.createdAt).toLocaleString('fr-FR'),
      `${log.user.firstName} ${log.user.lastName}`,
      log.user.email,
      log.action,
      log.details,
      log.ipAddress || 'N/A'
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      `${log.user.firstName} ${log.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())

    // Filter by active tab
    const matchesFilter = activeTab === 'ALL' ? true : log.action === activeTab

    // Hide UPDATE actions from the journal
    const isNotUpdate = log.action !== 'UPDATE'

    return matchesSearch && matchesFilter && isNotUpdate
  })

  const getActionBadge = (action: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      LOGIN: { bg: 'bg-blue-100', text: 'text-blue-700' },
      LOGOUT: { bg: 'bg-slate-100', text: 'text-slate-700' },
      CREATE: { bg: 'bg-green-100', text: 'text-green-700' },
      DELETE: { bg: 'bg-red-100', text: 'text-red-700' },
    }

    const { bg, text } = config[action] || { bg: 'bg-slate-100', text: 'text-slate-700' }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
        {action}
      </span>
    )
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Journal d'activité</h1>
            <p className="text-slate-600 mt-2">{logs.length} événement(s) total</p>
          </div>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabs Filter */}
          <div className="bg-white rounded-xl shadow-soft border border-slate-200 overflow-hidden">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex-1 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2
                    ${
                      activeTab === tab.key
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-xl shadow-soft border border-slate-200">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Aucune activité trouvée
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="h-10 w-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {log.user.firstName.charAt(0)}{log.user.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {log.user.firstName} {log.user.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{log.user.email}</p>
                        </div>
                        {getActionBadge(log.action)}
                      </div>
                      <p className="text-slate-700 ml-13">{log.details}</p>
                      <div className="flex items-center space-x-4 mt-2 ml-13 text-xs text-slate-500">
                        <span>
                          {new Date(log.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
