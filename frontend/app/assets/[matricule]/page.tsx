"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { api } from '../../../components/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '../../../components/auth-context'
import { AssetHistory } from '../../../components/asset-history'

type Asset = {
  Matricule: string;
  NomPrenom: string;
  Entite: string;
  Categorie: string;
  Marque: string;
  Modele: string;
  Code: string;
  SerialNumber: string;
  Etat: string;
  Validation: string;
  Remarque: string;
  DateDePassage: string | null;
  createdAt: string;
  updatedAt: string;
}

type WorkOrder = {
  id: string;
  titre: string;
  description: string;
  statut: string;
  priorite: string;
  echeance: string | null;
  createdAt: string;
}

type AuditLog = {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user?: { name: string };
}

const EDITABLE_FIELDS: Array<keyof Asset> = [
  'Matricule',
  'NomPrenom',
  'Entite',
  'Categorie',
  'Marque',
  'Modele',
  'Code',
  'SerialNumber',
  'Etat',
  'Validation',
  'Remarque',
  'DateDePassage'
]

// Technicien can now edit all fields (same as Admin)
const TECHNICIAN_EDITABLE_FIELDS: Array<keyof Asset> = [
  'Matricule',
  'NomPrenom',
  'Entite',
  'Categorie',
  'Marque',
  'Modele',
  'Code',
  'SerialNumber',
  'Etat',
  'Validation',
  'Remarque',
  'DateDePassage'
]

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const matricule = params.matricule as string
  const { user, isAuthenticated, hydrated } = useAuth()
  const role = user?.role
  const canEditAsset = role === 'Admin' || role === 'Technicien'
  const canManageAsset = role === 'Admin'
  const editableFields = useMemo(() => {
    if (role === 'Admin') return EDITABLE_FIELDS
    if (role === 'Technicien') return TECHNICIAN_EDITABLE_FIELDS
    return []
  }, [role])
  const canEditField = (field: keyof Asset) => editableFields.includes(field)
  
  const [asset, setAsset] = useState<Asset | null>(null)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Asset>>({})
  const isFieldEditable = (field: keyof Asset) => isEditing && canEditField(field)

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    loadAssetData()
  }, [matricule, hydrated, isAuthenticated])

  useEffect(() => {
    // Redirect to login if not authenticated
    if (hydrated && !isAuthenticated) {
      router.push('/login')
    }
  }, [hydrated, isAuthenticated, router])

  useEffect(() => {
    if (!hydrated) return
    if (searchParams?.get('mode') === 'edit' && canEditAsset) {
      setIsEditing(true)
    }
  }, [searchParams, canEditAsset, hydrated])

  useEffect(() => {
    if (!canEditAsset && isEditing) {
      setIsEditing(false)
    }
  }, [canEditAsset, isEditing])

  async function loadAssetData() {
    if (!hydrated || !isAuthenticated) {
      return
    }
    
    // Ensure token is set before making requests
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Session expirée. Veuillez vous reconnecter.')
      return
    }
    
    try {
      setLoading(true)
      const [assetResult, workOrdersResult, auditResult] = await Promise.allSettled([
        api.get(`/assets/${matricule}`),
        api.get(`/workorders?assetMatricule=${matricule}`),
        api.get(`/audit-logs?entityId=${matricule}&entityType=Asset`)
      ])

      if (assetResult.status === 'rejected') {
        throw assetResult.reason
      }

      const assetData = assetResult.value.data
      const workOrdersData = workOrdersResult.status === 'fulfilled' ? workOrdersResult.value.data : { items: [] }
      const auditData = auditResult.status === 'fulfilled' ? auditResult.value.data : []

      setAsset(assetData)
    setWorkOrders(workOrdersData.items || [])
    setAuditLogs(Array.isArray(auditData) ? auditData : [])
      setEditData(assetData)
    } catch (error: any) {
      console.error('Asset detail load failed:', error)
      const status = error?.response?.status
      if (status === 404) {
        setError(`L'actif avec le matricule "${matricule}" n'existe pas ou a été supprimé.`)
      } else {
        setError(error?.response?.data?.message || error?.response?.data?.error || 'Erreur lors du chargement')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!canEditAsset) {
      return
    }
    try {
      const payload = editableFields.reduce((acc, field) => {
        if (!(field in editData)) return acc
        const value = editData[field]
        if (value === '') {
          if (field === 'DateDePassage') {
            acc.DateDePassage = null
          } else {
            acc[field] = '' as any
          }
        } else if (value !== undefined) {
          acc[field] = value as any
        }
        return acc
      }, {} as Partial<Asset>)

      const response = await api.patch(`/assets/${matricule}`, payload)
      
      // If Matricule was changed, navigate to the new matricule page
      if (payload.Matricule && payload.Matricule !== matricule) {
        router.push(`/assets/${payload.Matricule}`)
      } else {
        // Otherwise, just update local state and reload
        setAsset(prev => ({ ...prev!, ...payload }))
        setIsEditing(false)
        loadAssetData() // Reload to get updated audit logs
      }
    } catch (error: any) {
      console.error('Asset save failed', error?.response?.data || error)
      const responseData = error?.response?.data
      const fieldErrors = responseData?.error?.fieldErrors
      const formErrors = responseData?.error?.formErrors
      const aggregatedFieldErrors = fieldErrors
        ? Object.entries(fieldErrors)
            .flatMap(([field, messages]) =>
              (messages as string[] | undefined)?.map(msg => `${field}: ${msg}`) ?? []
            )
        : []
      const detailedMessage = [
        ...(Array.isArray(formErrors) ? formErrors : []),
        ...aggregatedFieldErrors
      ].filter(Boolean).join('\n')
      setError(detailedMessage || responseData?.message || 'Erreur lors de la sauvegarde')
    }
  }

  async function handleDelete() {
    if (!canManageAsset) return
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet actif ?')) return
    
    try {
      await api.delete(`/assets/${matricule}`)
      router.push('/assets')
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  async function handleDuplicate() {
    if (!canManageAsset || !asset) return
    try {
      const duplicateData = { ...asset, Matricule: `${asset.Matricule}-COPY` }
      delete (duplicateData as any).createdAt
      delete (duplicateData as any).updatedAt
      
      await api.post('/assets', duplicateData)
      router.push(`/assets/${duplicateData.Matricule}`)
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erreur lors de la duplication')
    }
  }

  function getValidationBadge(validation: string) {
    const styles = {
      'OK': 'bg-green-100 text-green-800 border-green-200',
      'A_verifier': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Non_conforme': 'bg-red-100 text-red-800 border-red-200'
    }
    return styles[validation as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  function getStatusBadge(status: string) {
    const styles = {
      'Ouvert': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-yellow-100 text-yellow-800',
      'Terminé': 'bg-green-100 text-green-800',
      'Annulé': 'bg-gray-100 text-gray-800'
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  if (!hydrated) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <p className="text-gray-600">Chargement de votre session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Connexion requise</h1>
          <p className="text-gray-600">Veuillez vous connecter pour consulter les détails de l'actif.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Erreur</h2>
          <p className="text-red-700">{error || 'Actif non trouvé'}</p>
          <button
            onClick={() => router.push('/assets')}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <nav className="text-sm mb-2">
            <span className="text-gray-500">Actifs</span>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-gray-900 font-medium">{asset.Matricule}</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">{asset.Matricule}</h1>
          <p className="text-gray-600 mt-1">{asset.NomPrenom} • {asset.Entite}</p>
        </div>
        
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              {canEditAsset && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Modifier
                </button>
              )}
              {canManageAsset && (
                <>
                  <button
                    onClick={handleDuplicate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Dupliquer
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    Supprimer
                  </button>
                </>
              )}
              <button
                onClick={() => router.push('/assets')}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg"
              >
                Terminé
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Annuler
              </button>
              {canEditAsset && (
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Sauvegarder
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 text-sm mt-1">
            Fermer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations de l'actif</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="asset-matricule" className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                <input
                  id="asset-matricule"
                  type="text"
                  value={isFieldEditable('Matricule') ? editData.Matricule || '' : asset.Matricule}
                  onChange={e => setEditData({...editData, Matricule: e.target.value})}
                  disabled={!isFieldEditable('Matricule')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-nomprenom" className="block text-sm font-medium text-gray-700 mb-1">Nom Prénom</label>
                <input
                  id="asset-nomprenom"
                  type="text"
                  value={isFieldEditable('NomPrenom') ? editData.NomPrenom || '' : asset.NomPrenom}
                  onChange={e => setEditData({...editData, NomPrenom: e.target.value})}
                  disabled={!isFieldEditable('NomPrenom')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-entite" className="block text-sm font-medium text-gray-700 mb-1">Entité</label>
                <input
                  id="asset-entite"
                  type="text"
                  value={isFieldEditable('Entite') ? editData.Entite || '' : asset.Entite}
                  onChange={e => setEditData({...editData, Entite: e.target.value})}
                  disabled={!isFieldEditable('Entite')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-categorie" className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                {isFieldEditable('Categorie') ? (
                  <select
                    id="asset-categorie"
                    value={editData.Categorie || ''}
                    onChange={e => setEditData({...editData, Categorie: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Micro_ordinateur">Micro-ordinateur</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Serveur">Serveur</option>
                    <option value="Imprimante">Imprimante</option>
                    <option value="Autre">Autre</option>
                  </select>
                ) : (
                  <input
                    id="asset-categorie"
                    type="text"
                    value={asset.Categorie}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  />
                )}
              </div>
              
              <div>
                <label htmlFor="asset-marque" className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                <input
                  id="asset-marque"
                  type="text"
                  value={isFieldEditable('Marque') ? editData.Marque || '' : asset.Marque}
                  onChange={e => setEditData({...editData, Marque: e.target.value})}
                  disabled={!isFieldEditable('Marque')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-modele" className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                <input
                  id="asset-modele"
                  type="text"
                  value={isFieldEditable('Modele') ? editData.Modele || '' : asset.Modele}
                  onChange={e => setEditData({...editData, Modele: e.target.value})}
                  disabled={!isFieldEditable('Modele')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-code" className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  id="asset-code"
                  type="text"
                  value={isFieldEditable('Code') ? editData.Code || '' : asset.Code}
                  onChange={e => setEditData({...editData, Code: e.target.value})}
                  disabled={!isFieldEditable('Code')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-serial" className="block text-sm font-medium text-gray-700 mb-1">N° de série</label>
                <input
                  id="asset-serial"
                  type="text"
                  value={isFieldEditable('SerialNumber') ? editData.SerialNumber || '' : asset.SerialNumber}
                  onChange={e => setEditData({...editData, SerialNumber: e.target.value})}
                  disabled={!isFieldEditable('SerialNumber')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-etat" className="block text-sm font-medium text-gray-700 mb-1">État</label>
                <input
                  id="asset-etat"
                  type="text"
                  value={isFieldEditable('Etat') ? editData.Etat || '' : asset.Etat}
                  onChange={e => setEditData({...editData, Etat: e.target.value})}
                  disabled={!isFieldEditable('Etat')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label htmlFor="asset-validation" className="block text-sm font-medium text-gray-700 mb-1">Validation</label>
                {isFieldEditable('Validation') ? (
                  <select
                    id="asset-validation"
                    value={editData.Validation || ''}
                    onChange={e => setEditData({...editData, Validation: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="OK">Confirme</option>
                    <option value="A_verifier">À vérifier</option>
                    <option value="Non_conforme">Non confirme</option>
                  </select>
                ) : (
                  <div className="mt-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getValidationBadge(asset.Validation)}`}>
                      {asset.Validation === 'A_verifier' ? 'À vérifier' : 
                       asset.Validation === 'Non_conforme' ? 'Non confirme' : 
                       'Confirme'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <label htmlFor="asset-remarque" className="block text-sm font-medium text-gray-700 mb-1">Remarques</label>
              <textarea
                id="asset-remarque"
                value={isFieldEditable('Remarque') ? (editData.Remarque || '') : (asset.Remarque || '')}
                onChange={e => setEditData({...editData, Remarque: e.target.value})}
                disabled={!isFieldEditable('Remarque')}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Work Orders */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ordres de travail associés</h2>
            
            {workOrders.length > 0 ? (
              <div className="space-y-3">
                {workOrders.map(wo => (
                  <div key={wo.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{wo.titre}</h3>
                        <p className="text-sm text-gray-600 mt-1">{wo.description}</p>
                        {wo.echeance && (
                          <p className="text-xs text-gray-500 mt-2">
                            Échéance: {format(new Date(wo.echeance), 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(wo.statut)}`}>
                          {wo.statut}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Aucun ordre de travail associé</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">État de l'actif</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Validation</label>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getValidationBadge(asset.Validation)}`}>
                    {asset.Validation === 'A_verifier' ? 'À vérifier' : 
                     asset.Validation === 'Non_conforme' ? 'Non confirme' : 
                     'Confirme'}
                  </span>
                </div>
              </div>
              
              {asset.DateDePassage && (
                <div>
                  <label className="text-sm text-gray-600">Dernière vérification</label>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(asset.DateDePassage), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm text-gray-600">Créé le</label>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(asset.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Modifié le</label>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(asset.updatedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Timeline - Enhanced with AssetHistory Component */}
          <AssetHistory matricule={asset.Matricule} />
        </div>
      </div>
    </div>
  )
}