"use client"
import { useEffect, useState } from 'react'
import { api } from '../../components/api'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '../../components/auth-context'

type DataQualityMetrics = {
  duplicates: {
    matricules: Array<{
      matricule: string;
      count: number;
      assets: Array<{
        Matricule: string;
        NomPrenom: string;
        Entite: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
    serialNumbers: Array<{
      serialNumber: string;
      count: number;
      assets: Array<{
        Matricule: string;
        NomPrenom: string;
        SerialNumber: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
  };
  missingData: Array<{
    Matricule: string;
    NomPrenom: string;
    Categorie: string;
    Validation: string;
    SerialNumber: string;
  }>;
  summary: {
    totalAssets: number;
    duplicateMatricules: number;
    duplicateSerials: number;
    missingDataCount: number;
  };
}

export default function DataQualityPage() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fixingDuplicate, setFixingDuplicate] = useState<string | null>(null)
  const { user, isAuthenticated, hydrated } = useAuth()
  const isAdmin = user?.role === 'Admin'

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated || !isAdmin) {
      setLoading(false)
      return
    }
    loadDataQuality()
  }, [hydrated, isAuthenticated, isAdmin])

  async function loadDataQuality() {
    if (!hydrated || !isAdmin) return
    try {
      setLoading(true)
      setError('') // Clear previous errors
      const res = await api.get('/dashboard/data-quality')
      setMetrics(res.data)
    } catch (error: any) {
      console.error('Data quality error:', error)
      if (error.response?.status === 401) {
        setError('Votre session a expiré. Veuillez vous reconnecter.')
      } else {
        setError(error.response?.data?.message || 'Erreur lors du chargement')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDuplicate(matricule: string) {
    if (!isAdmin) return
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'actif ${matricule} ?`)) return
    
    try {
      setFixingDuplicate(matricule)
      await api.delete(`/assets/${matricule}`)
      await loadDataQuality() // Reload data
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erreur lors de la suppression')
    } finally {
      setFixingDuplicate(null)
    }
  }

  async function handleFixMissingData(matricule: string, field: string, value: string) {
    if (!isAdmin) return
    try {
      await api.patch(`/assets/${matricule}`, { [field]: value })
      await loadDataQuality() // Reload data
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erreur lors de la correction')
    }
  }

  function getQualityScore() {
    if (!metrics) return 0
    const { totalAssets, duplicateMatricules, duplicateSerials, missingDataCount } = metrics.summary
    if (totalAssets === 0) return 100
    
    const issues = duplicateMatricules + duplicateSerials + missingDataCount
    return Math.max(0, Math.round(((totalAssets - issues) / totalAssets) * 100))
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
          <p className="text-gray-600">Veuillez vous connecter pour accéder aux outils de qualité des données.</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Accès restreint</h1>
          <p className="text-gray-600">Seuls les administrateurs peuvent consulter et corriger la qualité des données.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-lg shadow h-32 bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    const isSessionExpired = error.includes('session a expiré') || error.includes('Session expirée')
    
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Erreur</h2>
          <p className="text-red-700 mb-4">{error || 'Impossible de charger les métriques'}</p>
          <div className="flex gap-3">
            {!isSessionExpired && (
              <button
                onClick={loadDataQuality}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Réessayer
              </button>
            )}
            {isSessionExpired && (
              <Link
                href="/login"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Se reconnecter
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const qualityScore = getQualityScore()
  const widthClass = (() => {
    const n = Math.max(0, Math.min(100, qualityScore))
    const step = Math.round(n / 10) * 10
    const map: Record<number, string> = {
      0: 'w-[0%]',
      10: 'w-[10%]',
      20: 'w-[20%]',
      30: 'w-[30%]',
      40: 'w-[40%]',
      50: 'w-[50%]',
      60: 'w-[60%]',
      70: 'w-[70%]',
      80: 'w-[80%]',
      90: 'w-[90%]',
      100: 'w-[100%]',
    }
    return map[step as 0|10|20|30|40|50|60|70|80|90|100]
  })()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Qualité des données</h1>
          <p className="text-gray-600 mt-1">Détection et correction des problèmes de données</p>
        </div>
        <button
          onClick={loadDataQuality}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Score de qualité</p>
              <p className={`text-2xl font-bold ${qualityScore >= 80 ? 'text-green-600' : qualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {qualityScore}%
              </p>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${qualityScore >= 80 ? 'bg-green-100' : qualityScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <svg className={`h-6 w-6 ${qualityScore >= 80 ? 'text-green-600' : qualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Matricules en doublon</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.summary.duplicateMatricules}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">N° série en doublon</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.summary.duplicateSerials}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6H5a1 1 0 110-2h2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Données manquantes</p>
              <p className="text-2xl font-bold text-red-600">{metrics.summary.missingDataCount}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Score Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score de qualité global</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Qualité des données</span>
          <span className="text-sm font-medium text-gray-900">{qualityScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`${widthClass} h-3 rounded-full transition-all duration-500 ${
              qualityScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
              qualityScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
              'bg-gradient-to-r from-red-500 to-red-600'
            }`}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Duplicate Matricules */}
      {metrics.duplicates.matricules.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Matricules en doublon</h3>
          <div className="space-y-4">
            {metrics.duplicates.matricules.map(duplicate => (
              <div key={duplicate.matricule} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-orange-900">
                    Matricule: {duplicate.matricule} ({duplicate.count} occurrences)
                  </h4>
                  <span className="text-sm text-orange-700 bg-orange-100 px-2 py-1 rounded">
                    Critique
                  </span>
                </div>
                <div className="space-y-2">
                  {duplicate.assets.map((asset, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white rounded p-3 border border-orange-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{asset.Matricule}</p>
                        <p className="text-sm text-gray-600">{asset.NomPrenom} • {asset.Entite}</p>
                        <p className="text-xs text-gray-500">
                          Créé: {format(new Date(asset.createdAt), 'dd/MM/yyyy', { locale: fr })} • 
                          Modifié: {format(new Date(asset.updatedAt), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Link
                          href={`/assets/${asset.Matricule}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Voir
                        </Link>
                        <button
                          onClick={() => handleDeleteDuplicate(asset.Matricule)}
                          disabled={fixingDuplicate === asset.Matricule}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          {fixingDuplicate === asset.Matricule ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Serial Numbers */}
      {metrics.duplicates.serialNumbers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Numéros de série en doublon</h3>
          <div className="space-y-4">
            {metrics.duplicates.serialNumbers.map(duplicate => (
              <div key={duplicate.serialNumber} className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-purple-900">
                    N° série: {duplicate.serialNumber} ({duplicate.count} occurrences)
                  </h4>
                  <span className="text-sm text-purple-700 bg-purple-100 px-2 py-1 rounded">
                    Important
                  </span>
                </div>
                <div className="space-y-2">
                  {duplicate.assets.map((asset, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white rounded p-3 border border-purple-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{asset.Matricule}</p>
                        <p className="text-sm text-gray-600">{asset.NomPrenom} • {asset.SerialNumber}</p>
                        <p className="text-xs text-gray-500">
                          Créé: {format(new Date(asset.createdAt), 'dd/MM/yyyy', { locale: fr })} • 
                          Modifié: {format(new Date(asset.updatedAt), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Link
                          href={`/assets/${asset.Matricule}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Voir
                        </Link>
                        <button
                          onClick={() => handleDeleteDuplicate(asset.Matricule)}
                          disabled={fixingDuplicate === asset.Matricule}
                          className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                        >
                          {fixingDuplicate === asset.Matricule ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Data */}
      {metrics.missingData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Données manquantes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom Prénom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Problèmes détectés</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.missingData.map(asset => {
                  const issues = []
                  if (!asset.Matricule) issues.push('Matricule manquant')
                  if (!asset.SerialNumber) issues.push('N° série manquant')
                  
                  return (
                    <tr key={asset.Matricule} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{asset.Matricule || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{asset.NomPrenom || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {issues.map(issue => (
                            <span key={issue} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              {issue}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/assets/${asset.Matricule}`}
                          className="text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          Corriger
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Good Message */}
      {metrics.summary.duplicateMatricules === 0 && 
       metrics.summary.duplicateSerials === 0 && 
       metrics.summary.missingDataCount === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <svg className="mx-auto h-16 w-16 text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-green-900 mb-2">Excellente qualité des données !</h3>
          <p className="text-green-700">Aucun problème de qualité détecté dans votre base de données.</p>
        </div>
      )}
    </div>
  )
}