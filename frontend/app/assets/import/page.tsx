"use client"
import { useMemo, useState } from 'react'
import { FileInput } from 'lucide-react'
import { api } from '../../../components/api'
import { useAuth } from '../../../components/auth-context'

type ValidationError = {
  row: number
  field: string
  message: string
  value: any
}

type PreviewData = {
  total: number
  duplicates: number[] | string[]
  validationErrors: ValidationError[]
  sampleData: any[]
  headers?: string[]
  suggestedMapping?: Record<string, string>
}

type ImportResult = {
  status: 'ok' | 'error' | 'skipped'
  row: number
  message?: string
  data?: any
}

const canonicalTargets = [
  'IGNORE',
  'Matricule',
  'NomPrenom',
  'Entite',
  'Categorie',
  'Marque',
  'Modele',
  'Code',
  'Serial Number',
  'Etat',
  'Validation',
  'Remarque',
  'Date De Passage',
]

export default function ImportAssetsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'update'>('skip')
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const { user, isAuthenticated, hydrated } = useAuth()
  const isAdmin = user?.role === 'Admin'

  function toBase64(f: File) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = reject
      r.readAsDataURL(f)
    })
  }

  async function downloadTemplate() {
    if (!isAdmin) return
    try {
      setBusy(true)
      
      // Try to download from backend first
      try {
        const res = await api.get('/assets/template.csv', {
          responseType: 'blob',
        })
        const blob = new Blob([res.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'template_import_assets.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        return
      } catch (apiError) {
        // Fallback to local file if backend is not available
        console.log('Backend not available, using local template')
        const a = document.createElement('a')
        a.href = '/asset_import_template.csv'
        a.download = 'template_import_assets.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (error) {
      setMsg("Erreur lors du téléchargement du template")
    } finally {
      setBusy(false)
    }
  }

  async function goToMapping() {
    if (!isAdmin) return
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      const b64 = await toBase64(file)
      const res = await api.post('/assets/import/preview', { fileBase64: b64 })
      setPreview(res.data)
      if (res.data?.suggestedMapping) setMapping(res.data.suggestedMapping)
      setStep(2)
    } catch (error: any) {
      setMsg(`Erreur: ${error.response?.data?.message || error.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function doPreview() {
    if (!isAdmin) return
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      const b64 = await toBase64(file)
      const payload: any = { fileBase64: b64 }
      if (Object.keys(mapping).length) payload.mapping = mapping
      const res = await api.post('/assets/import/preview', payload)
      setPreview(res.data)
      if (!Object.keys(mapping).length && res.data?.suggestedMapping) {
        setMapping(res.data.suggestedMapping)
      }
      setStep(3)
    } catch (error: any) {
      setMsg(`Erreur de prévisualisation: ${error.response?.data?.message || error.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function doCommit() {
    if (!isAdmin) return
    if (!file) return
    setBusy(true)
    setMsg('')
    try {
      const b64 = await toBase64(file)
      const payload: any = { fileBase64: b64, onDuplicate: duplicatePolicy }
      if (Object.keys(mapping).length) payload.mapping = mapping
      const res = await api.post('/assets/import/commit', payload)
      const results = res.data.results as ImportResult[]
      setImportResults(results)
      const successCount = results.filter((r) => r.status === 'ok').length
      const errorCount = results.filter((r) => r.status === 'error').length
      setMsg(`Import terminé: ${successCount} succès, ${errorCount} erreurs`)
    } catch (error: any) {
      setMsg(`Erreur d'import: ${error.response?.data?.message || error.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function downloadErrorReport() {
    if (!isAdmin) return
    if (!importResults) return
    const errors = importResults.filter((r) => r.status === 'error')
    const csvContent = [
      "Ligne,Message d'erreur",
      ...errors.map((e) => `${e.row},"${e.message || ''}"`),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rapport_erreurs_import.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const duplicateCount = useMemo(
    () => (preview?.duplicates ? (preview.duplicates as any[]).length : 0),
    [preview]
  )
  const duplicateLabel = useMemo(() => {
    if (!preview?.duplicates || (preview.duplicates as any[]).length === 0) return null
    return (preview.duplicates as any[]).slice(0, 20).join(', ')
  }, [preview])

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
          <p className="text-gray-600">Veuillez vous connecter pour accéder à l'import d'actifs.</p>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Accès restreint</h1>
          <p className="text-gray-600">Seuls les administrateurs peuvent importer de nouveaux actifs.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Import d'actifs</h1>
        <p className="text-gray-600">Importez vos actifs depuis un fichier CSV ou Excel</p>
      </div>

      {/* Steps */}
      <div className="flex items-center mb-6 text-sm">
        <div className={`flex-1 flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'bg-blue-600 text-white border-blue-600' : ''}`}>1</div>
          <span className="ml-2">Fichier</span>
        </div>
        <div className="w-8 h-px bg-gray-300 mx-2" />
        <div className={`flex-1 flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'bg-blue-600 text-white border-blue-600' : ''}`}>2</div>
          <span className="ml-2">Correspondance</span>
        </div>
        <div className="w-8 h-px bg-gray-300 mx-2" />
        <div className={`flex-1 flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 3 ? 'bg-blue-600 text-white border-blue-600' : ''}`}>3</div>
          <span className="ml-2">Prévisualisation</span>
        </div>
      </div>

      {/* Template Download */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-blue-700">Téléchargez le template CSV pour connaître le format attendu</p>
          </div>
          <div className="ml-3">
            <button onClick={downloadTemplate} disabled={busy} className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded">
              Télécharger template
            </button>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
        <div className="text-center">
          <FileInput className="mx-auto h-12 w-12 text-gray-400" strokeWidth={1.75} />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">{file ? file.name : 'Cliquez pour sélectionner un fichier'}</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null)
                  setPreview(null)
                  setImportResults(null)
                  setStep(1)
                }}
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">CSV, XLSX jusqu'à 10MB</p>
          </div>
        </div>
      </div>

      {/* Step 2: Mapping */}
      {file && step >= 2 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Correspondance des colonnes</h3>
          <p className="text-sm text-gray-600 mb-4">Assignez chaque colonne du fichier à un champ attendu.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Colonne source</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Champ cible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(preview?.headers || []).map((h) => (
                  <tr key={h}>
                    <td className="px-3 py-2 text-sm text-gray-900">{h}</td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={mapping[h] || 'IGNORE'}
                        onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                        aria-label={`Champ cible pour ${h}`}
                      >
                        {canonicalTargets.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Duplicate Policy */}
      {file && step >= 2 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Gestion des doublons (Matricule existant):</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="skip"
                checked={duplicatePolicy === 'skip'}
                onChange={(e) => setDuplicatePolicy(e.target.value as 'skip')}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Ignorer les doublons</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="update"
                checked={duplicatePolicy === 'update'}
                onChange={(e) => setDuplicatePolicy(e.target.value as 'update')}
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Mettre à jour les doublons</span>
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        {step === 1 && (
          <button onClick={goToMapping} disabled={!file || busy} className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium">
            {busy ? 'Chargement...' : 'Étape suivante: Correspondance'}
          </button>
        )}
        {step === 2 && (
          <button onClick={doPreview} disabled={!file || busy} className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium">
            {busy ? 'Chargement...' : 'Prévisualiser avec correspondance'}
          </button>
        )}
        {step >= 2 && (
          <button
            onClick={doCommit}
            disabled={!file || busy || ((preview?.validationErrors?.length ?? 0) > 0)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
          >
            {busy ? 'Import...' : 'Importer'}
          </button>
        )}
      </div>

      {/* Messages */}
      {msg && (
        <div className={`p-4 rounded-lg mb-6 ${msg.includes('Erreur') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>{msg}</div>
      )}

      {/* Preview Results */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Prévisualisation</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{preview.total}</div>
              <div className="text-sm text-blue-600">Lignes détectées</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{duplicateCount}</div>
              <div className="text-sm text-yellow-600">Doublons détectés</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{preview.validationErrors.length}</div>
              <div className="text-sm text-red-600">Erreurs de validation</div>
            </div>
          </div>

          {/* Duplicates */}
          {duplicateCount > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Doublons détectés (lignes):</h4>
              <div className="bg-yellow-50 p-3 rounded border">
                <p className="text-sm text-yellow-800">{duplicateLabel}</p>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {preview.validationErrors.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Erreurs de validation:</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-red-200">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Ligne</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Champ</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Erreur</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Valeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {preview.validationErrors.slice(0, 20).map((error, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm text-red-900">{error.row}</td>
                        <td className="px-3 py-2 text-sm text-red-900">{error.field}</td>
                        <td className="px-3 py-2 text-sm text-red-900">{error.message}</td>
                        <td className="px-3 py-2 text-sm text-red-900 max-w-xs truncate">{String(error.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.validationErrors.length > 20 && (
                  <div className="px-3 py-2 text-sm text-red-700 bg-red-100">... et {preview.validationErrors.length - 20} autres erreurs</div>
                )}
              </div>
            </div>
          )}

          {/* Sample Data */}
          {preview.sampleData && preview.sampleData.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Aperçu des données (5 premiers):</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(preview.sampleData[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.sampleData.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((value, vidx) => (
                            <td key={vidx} className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Résultats d'import</h3>
            {importResults.some((r) => r.status === 'error') && (
              <button onClick={downloadErrorReport} className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                Télécharger rapport d'erreurs
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{importResults.filter((r) => r.status === 'ok').length}</div>
              <div className="text-sm text-green-600">Importés avec succès</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{importResults.filter((r) => r.status === 'error').length}</div>
              <div className="text-sm text-red-600">Erreurs d'import</div>
            </div>
          </div>

          {/* Error Details */}
          {importResults.some((r) => r.status === 'error') && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Détail des erreurs:</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-red-200">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Ligne</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {importResults
                      .filter((r) => r.status === 'error')
                      .slice(0, 20)
                      .map((result, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm text-red-900">{result.row}</td>
                          <td className="px-3 py-2 text-sm text-red-900">{result.message}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
