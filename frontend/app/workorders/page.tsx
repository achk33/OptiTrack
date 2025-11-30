"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '../../components/auth-context'
import { api } from '../../components/api'
import { WorkOrderModal } from '../../components/work-order-modal'
import Link from 'next/link'
import { 
  Wrench, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react'

type WorkOrder = {
  id: string
  assetMatricule: string
  taches: any
  priorite: string
  assigne: string | null
  echeance: string
  statut: string
  commentaires: any
  tempsPasse: number
  attachments: any
  createdAt: string
  updatedAt: string
  assignedUserId: string | null
  asset?: {
    Matricule: string
    NomPrenom: string
  }
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | undefined>()
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const { user, isAuthenticated, hydrated } = useAuth()
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    loadWorkOrders()
  }, [hydrated, isAuthenticated])

  async function loadWorkOrders() {
    try {
      setLoading(true)
      const res = await api.get('/workorders')
      // Backend returns { items, total, page, pageSize }
      const data = res.data.items || res.data
      setWorkOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load work orders:', error)
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedWorkOrder(undefined)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEdit = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ordre de travail ?')) {
      return
    }

    try {
      await api.delete(`/workorders/${id}`)
      loadWorkOrders()
    } catch (error) {
      console.error('Failed to delete work order:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = wo.assetMatricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wo.asset?.Matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wo.assigne?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || wo.statut === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || wo.priorite === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgente':
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'haute':
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'moyenne':
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'basse':
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'terminé':
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'en cours':
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'en attente':
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'en attente':
      case 'pending': return 'En attente'
      case 'en cours':
      case 'in_progress': return 'En cours'
      case 'terminé':
      case 'completed': return 'Terminé'
      case 'annulé':
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgente':
      case 'urgent': return 'Urgent'
      case 'haute':
      case 'high': return 'Haute'
      case 'moyenne':
      case 'medium': return 'Moyenne'
      case 'basse':
      case 'low': return 'Basse'
      default: return priority
    }
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
          <p className="text-gray-600 mb-4">Veuillez vous connecter pour accéder aux ordres de travail.</p>
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
            <Wrench className="h-6 w-6 text-blue-600" />
            Ordres de travail
          </h1>
          <p className="text-gray-600 mt-1">Gestion des interventions et maintenances</p>
        </div>
        {isAdmin && (
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nouvel ordre
          </button>
        )}
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filtrer par statut"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Terminé</option>
            <option value="CANCELLED">Annulé</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filtrer par priorité"
          >
            <option value="ALL">Toutes les priorités</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">Haute</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="LOW">Basse</option>
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement des ordres de travail...</p>
        </div>
      ) : filteredWorkOrders.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun ordre de travail</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Aucun ordre ne correspond à vos critères de recherche.'
              : 'Aucun ordre de travail créé pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredWorkOrders.map((wo) => (
            <div key={wo.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {getStatusIcon(wo.statut)}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Ordre de travail #{wo.id.slice(0, 8)}
                      </h3>
                      {wo.taches && (
                        <div className="text-gray-700 mt-2">
                          {(() => {
                            try {
                              const tasks = typeof wo.taches === 'string' ? JSON.parse(wo.taches) : wo.taches
                              if (Array.isArray(tasks)) {
                                return (
                                  <ul className="space-y-1">
                                    {tasks.map((task: any, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className={`mt-1 ${task.done ? 'text-green-600' : 'text-gray-400'}`}>
                                          {task.done ? '✓' : '○'}
                                        </span>
                                        <span className={task.done ? 'line-through text-gray-500' : ''}>
                                          {task.label || task}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )
                              }
                              return <p className="text-sm">{String(tasks)}</p>
                            } catch {
                              return <p className="text-sm">{String(wo.taches)}</p>
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {wo.asset && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Actif:</span>
                        <span>{wo.asset.Matricule}</span>
                      </div>
                    )}
                    {wo.assigne && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{wo.assigne}</span>
                      </div>
                    )}
                    {wo.echeance && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(wo.echeance).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(wo.priorite)}`}>
                      {getPriorityLabel(wo.priorite)}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 text-center">
                      {getStatusLabel(wo.statut)}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEdit(wo)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(wo.id)}
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
      <WorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadWorkOrders}
        workOrder={selectedWorkOrder}
        mode={modalMode}
      />
    </div>
  )
}
