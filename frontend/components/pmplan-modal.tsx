"use client"

import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { api } from './api'

type PMPlanFormData = {
  name: string
  scopeType: 'ASSET' | 'CATEGORY' | 'ENTITY'
  scopeValue: string
  periodicite: 'MIS' | 'TRI' | 'SEMESTRE' | 'ANNUEL'
  taches: string
  ownerRole: 'Admin' | 'Manager' | 'Technician'
  active: boolean
  nextRunAt: string
}

type Asset = {
  Matricule: string
  NomPrenom: string
  Categorie: string
  Entite?: string
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
    name: '',
    scopeType: 'ASSET',
    scopeValue: '',
    periodicite: 'MIS',
    taches: '',
    ownerRole: 'Technician',
    active: true,
    nextRunAt: '',
  })
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadAssets()
      if (mode === 'edit' && pmPlan) {
        // Parse taches JSON if it's a string
        let tachesString = ''
        try {
          const tachesArray = typeof pmPlan.taches === 'string' ? JSON.parse(pmPlan.taches) : pmPlan.taches
          tachesString = Array.isArray(tachesArray) 
            ? tachesArray.map((t: any) => t.label).join('\n')
            : ''
        } catch {
          tachesString = ''
        }

        setFormData({
          name: pmPlan.name || '',
          scopeType: pmPlan.scopeType || 'ASSET',
          scopeValue: pmPlan.scopeValue || '',
          periodicite: pmPlan.periodicite || 'MIS',
          taches: tachesString,
          ownerRole: pmPlan.ownerRole || 'Technician',
          active: pmPlan.active ?? true,
          nextRunAt: pmPlan.nextRunAt ? new Date(pmPlan.nextRunAt).toISOString().split('T')[0] : '',
        })
      } else {
        // Default to 30 days from now for new plans
        const defaultNextRun = new Date()
        defaultNextRun.setDate(defaultNextRun.getDate() + 30)
        
        setFormData({
          name: '',
          scopeType: 'ASSET',
          scopeValue: '',
          periodicite: 'MIS',
          taches: '',
          ownerRole: 'Technician',
          active: true,
          nextRunAt: defaultNextRun.toISOString().split('T')[0],
        })
      }
      setError('')
    }
  }, [isOpen, mode, pmPlan])

  async function loadAssets() {
    try {
      setIsLoadingAssets(true)
      const response = await api.get('/assets')
      // Handle pagination
      const data = response.data.items || response.data
      setAssets(Array.isArray(data) ? data : [])
      
      // Extract unique categories and entities
      if (Array.isArray(data)) {
        const uniqueCategories = [...new Set(data.map((a: Asset) => a.Categorie).filter(Boolean))]
        const uniqueEntities = [...new Set(data.map((a: Asset) => a.Entite).filter(Boolean))]
        setCategories(uniqueCategories as string[])
        setEntities(uniqueEntities as string[])
      }
    } catch (err) {
      console.error('Failed to load assets:', err)
    } finally {
      setIsLoadingAssets(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.scopeValue || !formData.taches) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsLoading(true)

    try {
      // Convert taches from string to JSON array
      const tachesLines = formData.taches.split('\n').filter(line => line.trim())
      const tachesArray = tachesLines.map(line => ({
        label: line.trim(),
        done: false
      }))

      const payload = {
        name: formData.name,
        scopeType: formData.scopeType,
        scopeValue: formData.scopeValue,
        periodicite: formData.periodicite,
        taches: tachesArray,
        ownerRole: formData.ownerRole,
        active: formData.active,
        nextRunAt: formData.nextRunAt ? new Date(formData.nextRunAt).toISOString() : null,
      }

      if (mode === 'create') {
        await api.post('/pmplans', payload)
      } else {
        await api.patch(`/pmplans/${pmPlan.id}`, payload)
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du plan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Maintenance préventive mensuelle"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          {/* Scope Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de portée <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.scopeType}
              onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any, scopeValue: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              aria-label="Type de portée"
            >
              <option value="ASSET">Actif spécifique</option>
              <option value="CATEGORY">Catégorie d'actifs</option>
              <option value="ENTITY">Entité</option>
            </select>
          </div>

          {/* Scope Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.scopeType === 'ASSET' && 'Actif'}
              {formData.scopeType === 'CATEGORY' && 'Catégorie'}
              {formData.scopeType === 'ENTITY' && 'Entité'}
              {' '}<span className="text-red-500">*</span>
            </label>
            {isLoadingAssets ? (
              <div className="text-sm text-gray-500">Chargement...</div>
            ) : (
              <select
                value={formData.scopeValue}
                onChange={(e) => setFormData({ ...formData, scopeValue: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
                aria-label="Sélectionner la valeur de portée"
              >
                <option value="">Sélectionner...</option>
                {formData.scopeType === 'ASSET' && assets.map((asset) => (
                  <option key={asset.Matricule} value={asset.Matricule}>
                    {asset.Matricule} - {asset.NomPrenom} ({asset.Categorie})
                  </option>
                ))}
                {formData.scopeType === 'CATEGORY' && categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {formData.scopeType === 'ENTITY' && entities.map((ent) => (
                  <option key={ent} value={ent}>{ent}</option>
                ))}
              </select>
            )}
          </div>

          {/* Periodicite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Périodicité <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.periodicite}
              onChange={(e) => setFormData({ ...formData, periodicite: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              aria-label="Périodicité"
            >
              <option value="MIS">Mensuel</option>
              <option value="TRI">Trimestriel</option>
              <option value="SEMESTRE">Semestriel</option>
              <option value="ANNUEL">Annuel</option>
            </select>
          </div>

          {/* Taches */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tâches <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.taches}
              onChange={(e) => setFormData({ ...formData, taches: e.target.value })}
              placeholder="Une tâche par ligne...&#10;Ex:&#10;Vérifier les niveaux&#10;Nettoyer les filtres&#10;Inspecter les câbles"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Une tâche par ligne. Ces tâches seront ajoutées aux ordres de travail générés.
            </p>
          </div>

          {/* Owner Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle responsable <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.ownerRole}
              onChange={(e) => setFormData({ ...formData, ownerRole: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              aria-label="Rôle responsable"
            >
              <option value="Admin">Administrateur</option>
              <option value="Manager">Manager</option>
              <option value="Technician">Technicien</option>
            </select>
          </div>

          {/* Next Run At */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prochaine exécution <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.nextRunAt}
              onChange={(e) => setFormData({ ...formData, nextRunAt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
              aria-label="Prochaine exécution"
            />
            <p className="text-sm text-gray-500 mt-1">
              Date à laquelle le plan générera le prochain ordre de travail
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="isActive" className="flex-1 cursor-pointer">
              <span className="block text-sm font-medium text-gray-900">
                Plan actif
              </span>
              <span className="block text-sm text-gray-500">
                {formData.active 
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
