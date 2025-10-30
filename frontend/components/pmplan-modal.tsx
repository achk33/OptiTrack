"use client"

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { api } from './api'

type PMPlanFormData = {
  assetId: string
  title: string
  description: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  isActive: boolean
  nextDue: string
}

type Asset = {
  Matricule: string
  NomPrenom: string
  Categorie: string
}

type PMPlanModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  pmPlan?: any
  mode: 'create' | 'edit'
}

export function PMPlanModal({ isOpen, onClose, onSuccess, pmPlan, mode }: PMPlanModalProps) {
  const [formData, setFormData] = useState<PMPlanFormData>({
    assetId: '',
    title: '',
    description: '',
    frequency: 'MONTHLY',
    isActive: true,
    nextDue: '',
  })
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadAssets()
      if (mode === 'edit' && pmPlan) {
        setFormData({
          assetId: pmPlan.assetId || '',
          title: pmPlan.title || '',
          description: pmPlan.description || '',
          frequency: pmPlan.frequency || 'MONTHLY',
          isActive: pmPlan.isActive ?? true,
          nextDue: pmPlan.nextDue ? new Date(pmPlan.nextDue).toISOString().split('T')[0] : '',
        })
      } else {
        // Default to 30 days from now for new plans
        const defaultNextDue = new Date()
        defaultNextDue.setDate(defaultNextDue.getDate() + 30)
        
        setFormData({
          assetId: '',
          title: '',
          description: '',
          frequency: 'MONTHLY',
          isActive: true,
          nextDue: defaultNextDue.toISOString().split('T')[0],
        })
      }
      setError('')
    }
  }, [isOpen, mode, pmPlan])

  async function loadAssets() {
    try {
      setIsLoadingAssets(true)
      const response = await api.get('/assets')
      setAssets(response.data)
    } catch (err) {
      console.error('Failed to load assets:', err)
    } finally {
      setIsLoadingAssets(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.assetId || !formData.title) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        ...formData,
        nextDue: formData.nextDue ? new Date(formData.nextDue).toISOString() : null,
      }

      if (mode === 'create') {
        await api.post('/pmplans', payload)
      } else {
        await api.put(`/pmplans/${pmPlan.id}`, payload)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setIsLoading(false)
    }
  }

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'DAILY': return 'Tous les jours'
      case 'WEEKLY': return 'Toutes les semaines'
      case 'MONTHLY': return 'Tous les mois'
      case 'QUARTERLY': return 'Tous les 3 mois'
      case 'YEARLY': return 'Tous les ans'
      default: return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Nouveau plan de maintenance' : 'Modifier le plan de maintenance'}
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
                value={formData.assetId}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
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

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Maintenance préventive mensuelle"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails des tâches de maintenance..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fréquence <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              aria-label="Sélectionner la fréquence"
            >
              <option value="DAILY">Quotidien</option>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="MONTHLY">Mensuel</option>
              <option value="QUARTERLY">Trimestriel</option>
              <option value="YEARLY">Annuel</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              📅 {getFrequencyDescription(formData.frequency)}
            </p>
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prochaine échéance <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.nextDue}
              onChange={(e) => setFormData({ ...formData, nextDue: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
              aria-label="Prochaine échéance"
            />
            <p className="text-sm text-gray-500 mt-1">
              Date de la première ou prochaine maintenance planifiée
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="isActive" className="flex-1 cursor-pointer">
              <span className="block text-sm font-medium text-gray-900">
                Plan actif
              </span>
              <span className="block text-sm text-gray-500">
                {formData.isActive 
                  ? 'Ce plan générera automatiquement des ordres de travail' 
                  : 'Ce plan est désactivé et ne générera pas d\'ordres de travail'}
              </span>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              ℹ️ À propos des plans de maintenance
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Les plans actifs génèrent automatiquement des ordres de travail</li>
              <li>• La date d'échéance est recalculée selon la fréquence choisie</li>
              <li>• Vous recevrez des rappels avant chaque échéance</li>
            </ul>
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
