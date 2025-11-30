"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '../../components/auth-context'
import { api } from '../../components/api'
import { PMPlanModal } from '../../components/pmplan-modal'
import Link from 'next/link'
import { 
  Calendar, 
  Plus, 
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Edit,
  Trash2
} from 'lucide-react'

type PMPlan = {
  id: string
  name: string
  scopeType: string
  scopeValue: string
  periodicite: string
  taches: any
  ownerRole: string
  nextRunAt: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  lastRunAt: string | null
}

export default function PMPlansPage() {
  const [pmPlans, setPmPlans] = useState<PMPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PMPlan | undefined>()
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const { user, isAuthenticated, hydrated } = useAuth()
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    loadPMPlans()
  }, [hydrated, isAuthenticated])

  async function loadPMPlans() {
    try {
      setLoading(true)
      const res = await api.get('/pmplans')
      // Handle both old format (array) and new format (object with items)
      const plans = Array.isArray(res.data) ? res.data : res.data.items || []
      setPmPlans(plans)
    } catch (error) {
      console.error('Failed to load PM plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedPlan(undefined)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEdit = (plan: PMPlan) => {
    setSelectedPlan(plan)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plan de maintenance ?')) {
      return
    }

    try {
      await api.delete(`/pmplans/${id}`)
      loadPMPlans()
    } catch (error) {
      console.error('Failed to delete PM plan:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const filteredPlans = pmPlans.filter(plan => {
    const matchesSearch = plan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.scopeValue?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFrequency = frequencyFilter === 'ALL' || plan.periodicite === frequencyFilter
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && plan.active) ||
                         (statusFilter === 'INACTIVE' && !plan.active)
    return matchesSearch && matchesFrequency && matchesStatus
  })

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency?.toUpperCase()) {
      case 'MIS': return 'Mensuel'
      case 'TRI': return 'Trimestriel'
      case 'SEMESTRE': return 'Semestriel'
      case 'ANNUEL': return 'Annuel'
      default: return frequency
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency?.toUpperCase()) {
      case 'MIS': return 'bg-green-100 text-green-800 border-green-200'
      case 'TRI': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'SEMESTRE': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ANNUEL': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const isDueOrOverdue = (nextRunAt: string | null) => {
    if (!nextRunAt) return false
    const dueDate = new Date(nextRunAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate <= today
  }

  if (!hydrated) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Connexion requise</h1>
          <p className="text-gray-600 mb-4">Veuillez vous connecter pour accéder aux plans de maintenance.</p>
          <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Plans de maintenance préventive
          </h1>
          <p className="text-gray-600 mt-1">Gestion des maintenances planifiées et récurrentes</p>
        </div>
        {isAdmin && (
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nouveau plan
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Plans actifs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pmPlans.filter(p => p.isActive).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">À échéance</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {pmPlans.filter(p => p.isActive && isDueOrOverdue(p.nextDue)).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total plans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pmPlans.length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Frequency Filter */}
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filtrer par fréquence"
          >
            <option value="ALL">Toutes les fréquences</option>
            <option value="MIS">Mensuel</option>
            <option value="TRI">Trimestriel</option>
            <option value="SEMESTRE">Semestriel</option>
            <option value="ANNUEL">Annuel</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filtrer par statut"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actifs</option>
            <option value="INACTIVE">Inactifs</option>
          </select>
        </div>
      </div>

      {/* PM Plans List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement des plans de maintenance...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun plan de maintenance</h3>
          <p className="text-gray-600">
            {searchTerm || frequencyFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Aucun plan ne correspond à vos critères de recherche.'
              : 'Aucun plan de maintenance créé pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {plan.active ? (
                      isDueOrOverdue(plan.nextRunAt) ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      )
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                      {plan.taches && (
                        <div className="text-gray-700 mt-2">
                          {(() => {
                            try {
                              const tasks = typeof plan.taches === 'string' ? JSON.parse(plan.taches) : plan.taches
                              if (Array.isArray(tasks)) {
                                return (
                                  <ul className="space-y-1 text-sm">
                                    {tasks.slice(0, 3).map((task: any, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-gray-400 mt-0.5">○</span>
                                        <span>{task.label || task}</span>
                                      </li>
                                    ))}
                                    {tasks.length > 3 && <li className="text-gray-500 text-xs">+{tasks.length - 3} autres tâches</li>}
                                  </ul>
                                )
                              }
                              return null
                            } catch {
                              return null
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Type:</span>
                      <span>{plan.scopeType} - {plan.scopeValue}</span>
                    </div>
                    {plan.lastRunAt && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Dernière:</span>
                        <span>{new Date(plan.lastRunAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    {plan.nextRunAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className={isDueOrOverdue(plan.nextRunAt) ? 'font-semibold text-yellow-600' : ''}>
                          {new Date(plan.nextRunAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getFrequencyColor(plan.periodicite)}`}>
                      {getFrequencyLabel(plan.periodicite)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border text-center ${
                      plan.active 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                      {plan.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <PMPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadPMPlans}
        pmPlan={selectedPlan}
        mode={modalMode}
      />
    </div>
  )
}
