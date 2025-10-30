"use client"
import { Suspense, useCallback, useEffect, useState } from 'react'
import { api } from '../../components/api'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '../../components/auth-context'

function AssetsPageContent() {
  const searchParams = useSearchParams()
  const { user, isAuthenticated, hydrated } = useAuth()
  const role = user?.role
  const canImport = role === 'Admin'
  const canEditAssets = role === 'Admin' || role === 'Technicien'
  const [items, setItems] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [code, setCode] = useState('')
  const [entite, setEntite] = useState('')
  const [categorie, setCategorie] = useState('')
  const [etat, setEtat] = useState('')
  const [validation, setValidation] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const fetchData = useCallback(async () => {
    if (!hydrated || !isAuthenticated) return
    setLoading(true)
    try {
      const params: any = { q, page, pageSize }
      if (code.trim()) params.Code = code.trim()
      if (entite.trim()) params.Entite = entite.trim()
      if (categorie.trim()) params.Categorie = categorie.trim()
      if (etat.trim()) params.Etat = etat.trim()
      if (validation.trim()) params.Validation = validation.trim()
      const res = await api.get('/assets', { params })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }, [hydrated, isAuthenticated, q, page, pageSize, code, entite, categorie, etat, validation])

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    // Initialize filters from URL
    const V = searchParams.get('Validation')
    const E = searchParams.get('Entite')
    const C = searchParams.get('Categorie')
    const S = searchParams.get('Etat')
    if (V) setValidation(V)
    if (E) setEntite(E)
    if (C) setCategorie(C)
    if (S) setEtat(S)
    fetchData()
  }, [hydrated, isAuthenticated, searchParams, fetchData])

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    fetchData()
  }, [page, pageSize, hydrated, isAuthenticated, fetchData])

  function handleSearch() {
    setPage(1) // Reset to first page when searching
    fetchData()
  }

  function getValidationBadge(validation: string) {
    const styles = {
      'OK': 'bg-green-100 text-green-800',
      'A_verifier': 'bg-yellow-100 text-yellow-800',
      'Non_conforme': 'bg-red-100 text-red-800'
    }
    return styles[validation as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  if (!hydrated) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <p className="text-gray-600">Chargement de votre session...</p>
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Connexion requise</h1>
          <p className="text-gray-600">Veuillez vous connecter pour consulter la liste des actifs.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actifs</h1>
          <p className="text-gray-600 mt-1">Gérez vos équipements informatiques</p>
        </div>
        <div className="flex gap-3">
          {canImport && (
            <Link
              href="/assets/import"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Importer
            </Link>
          )}
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (entite) params.append('Entite', entite);
              if (categorie) params.append('Categorie', categorie);
              if (etat) params.append('Etat', etat);
              if (validation) params.append('Validation', validation);
              const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
              const token = localStorage.getItem('token');
              // Open backend export endpoint with auth token
              window.open(`${backendUrl}/assets/export/excel?${params.toString()}&token=${token}`, '_blank');
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
          >
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-3">
          <input 
            value={q} 
            onChange={e=>setQ(e.target.value)} 
            placeholder="Recherche (Matricule/Serial/Nom)" 
            className="flex-1 min-w-64 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input 
            value={code} 
            onChange={e=>setCode(e.target.value)} 
            placeholder="Code (ex: UC110398)" 
            className="w-48 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select value={validation} onChange={e=>setValidation(e.target.value)} className="w-48 border border-gray-300 rounded-lg px-2 py-2 text-sm" aria-label="Filtre Validation">
            <option value="">Validation: Toutes</option>
            <option value="OK">Conforme</option>
            <option value="A_verifier">À vérifier</option>
            <option value="Non_conforme">Non conforme</option>
          </select>
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">
            {total} actif{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''} 
            {total > pageSize && (
              <span className="text-gray-500 ml-2">
                (page {page} de {Math.ceil(total / pageSize)})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-600">Afficher:</label>
            <select 
              id="pageSize"
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom Prénom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marque</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modèle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validation</th>
                {canEditAssets && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.Matricule} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.Matricule}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.NomPrenom}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.Entite}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.Categorie}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.Marque}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.Modele}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getValidationBadge(item.Validation)}`}>
                      {item.Validation === 'A_verifier' ? 'À vérifier' : 
                       item.Validation === 'Non_conforme' ? 'Non conforme' : 
                       'Conforme'}
                    </span>
                  </td>
                  {canEditAssets && (
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/assets/${item.Matricule}?mode=edit`}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        Éditer
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun actif trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">Essayez de modifier vos critères de recherche</p>
          </div>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {(page - 1) * pageSize + 1} à {Math.min(page * pageSize, total)} sur {total} résultats
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-700">
                Page {page} sur {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function AssetsPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6 max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
            <p className="text-gray-600">Chargement des actifs...</p>
          </div>
        </main>
      }
    >
      <AssetsPageContent />
    </Suspense>
  )
}
