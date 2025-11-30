"use client"

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { api } from './api'

type WorkOrderFormData = {
  assetMatricule: string
  taches: string
  priorite: string
  statut: string
  assigne: string
  echeance: string
}

type Asset = {
  Matricule: string
  NomPrenom: string
  Categorie: string
}

type WorkOrderModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  workOrder?: any
  mode: 'create' | 'edit'
}

export function WorkOrderModal({ isOpen, onClose, onSuccess, workOrder, mode }: WorkOrderModalProps) {
  const [formData, setFormData] = useState<WorkOrderFormData>({
    assetMatricule: '',
    taches: '',
    priorite: 'Moyenne',
    statut: 'En attente',
    assigne: '',
    echeance: '',
  })
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadAssets()
      if (mode === 'edit' && workOrder) {
        setFormData({
          assetMatricule: workOrder.assetMatricule || '',
          taches: typeof workOrder.taches === 'string' ? workOrder.taches : JSON.stringify(workOrder.taches) || '',
          priorite: workOrder.priorite || 'Moyenne',
          statut: workOrder.statut || 'En attente',
          assigne: workOrder.assigne || '',
          echeance: workOrder.echeance ? new Date(workOrder.echeance).toISOString().split('T')[0] : '',
        })
      } else {
        setFormData({
          assetMatricule: '',
          taches: '',
          priorite: 'Moyenne',
          statut: 'En attente',
          assigne: '',
          echeance: '',
        })
      }
      setError('')
    }
  }, [isOpen, mode, workOrder])

  async function loadAssets() {
    try {
      setIsLoadingAssets(true)
      const response = await api.get('/assets')
      // Backend may return { items: [] } or direct array
      const data = response.data.items || response.data
      setAssets(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load assets:', err)
      setAssets([])
    } finally {
      setIsLoadingAssets(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.assetMatricule || !formData.taches) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        assetMatricule: formData.assetMatricule,
        taches: formData.taches,
        priorite: formData.priorite,
        statut: formData.statut,
        assigne: formData.assigne || null,
        echeance: formData.echeance ? new Date(formData.echeance).toISOString() : new Date().toISOString(),
        commentaires: [],
        tempsPasse: 0,
        attachments: []
      }

      if (mode === 'create') {
        await api.post('/workorders', payload)
      } else {
        await api.patch(`/workorders/${workOrder.id}`, payload)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Nouvel ordre de travail' : 'Modifier l\'ordre de travail'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actif <span className="text-red-500">*</span>
            </label>
            {isLoadingAssets ? (
              <div className="text-sm text-gray-500">Chargement des actifs...</div>
            ) : (
              <select
                value={formData.assetMatricule}
                onChange={(e) => setFormData({ ...formData, assetMatricule: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
                aria-label="Sélectionner un actif"
              >
                <option value="">Sélectionner un actif</option>
                {assets.map((asset) => (
                  <option key={asset.Matricule} value={asset.Matricule}>
                    {asset.Matricule} - {asset.NomPrenom} ({asset.Categorie})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tasks/Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tâches / Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.taches}
              onChange={(e) => setFormData({ ...formData, taches: e.target.value })}
              placeholder="Détails de l'intervention..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
              disabled={isLoading}
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorité
              </label>
              <select
                value={formData.priorite}
                onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                aria-label="Sélectionner la priorité"
              >
                <option value="Basse">Basse</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Haute">Haute</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={formData.statut}
                onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                aria-label="Sélectionner le statut"
              >
                <option value="En attente">En attente</option>
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
                <option value="Annulé">Annulé</option>
              </select>
            </div>
          </div>

          {/* Assigned To and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigné à
              </label>
              <input
                type="text"
                value={formData.assigne}
                onChange={(e) => setFormData({ ...formData, assigne: e.target.value })}
                placeholder="Nom du technicien"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'échéance
              </label>
              <input
                type="date"
                value={formData.echeance}
                onChange={(e) => setFormData({ ...formData, echeance: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                aria-label="Date d'échéance"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {mode === 'create' ? 'Créer' : 'Enregistrer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
