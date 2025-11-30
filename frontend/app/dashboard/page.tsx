"use client"
import { useEffect, useState } from 'react'
import { api, setAuthToken } from '../../components/api'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChartCard } from '../../components/chart-card'
import { Card, CardContent, CardHeader, CardTitle, StatsCard } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { StatusBadge, RoleBadge } from '../../components/ui/badge'
import { SearchInput } from '../../components/ui/input'
import { 
  Server, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Settings,
  Users,
  Zap,
  Shield,
  Gauge,
  Plus,
  Calendar,
  FileText,
  Clock,
  Bell
} from 'lucide-react'
import { Progress, CircularProgress } from '../../components/ui/progress'

const logger = {
  error: (message: string, error?: any) => console.error(message, error)
}

type KPIData = {
  woOuverts: number;
  woEnRetard: number;
  actifsTotal: number;
  actifsOK: number;
  actifsAVerifier: number;
  actifsNonConformes: number;
  woCreated30?: number;
  woCreatedPrev30?: number;
  assetsByCategory?: {
    Laptop: number;
    Imprimante: number;
    Serveur: number;
    Micro_ordinateur: number;
  };
}

type ChartData = {
  name: string;
  value: number;
  [key: string]: any; 
}

type ActivityData = {
  date: string;
  count: number;
}

type WorkOrderData = {
  month: string;
  created: number;
  completed: number;
  overdue: number;
}

type HealthData = {
  healthScore: number;
  total: number;
  breakdown: {
    ok: number;
    aVerifier: number;
    nonConforme: number;
  }
}

type PMStatsData = {
  totalActivePlans: number;
  byPeriodicity: {
    MIS: { count: number; plans: any[]; totalWorkOrders: number; months: number };
    TRI: { count: number; plans: any[]; totalWorkOrders: number; months: number };
    SEMESTRE: { count: number; plans: any[]; totalWorkOrders: number; months: number };
    ANNUEL: { count: number; plans: any[]; totalWorkOrders: number; months: number };
  };
  upcomingMaintenance: Array<{
    id: string;
    name: string;
    periodicite: string;
    nextRunAt: string;
    daysUntil: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const STATUS_COLORS = {
  OK: '#10B981',
  A_verifier: '#F59E0B', 
  Non_conforme: '#EF4444'
};

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, hydrated } = useAuth()
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [entiteData, setEntiteData] = useState<ChartData[]>([])
  const [categorieData, setCategorieData] = useState<ChartData[]>([])
  const [validationData, setValidationData] = useState<ChartData[]>([])
  const [etatData, setEtatData] = useState<ChartData[]>([])
  const [marqueData, setMarqueData] = useState<ChartData[]>([])
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [workOrderData, setWorkOrderData] = useState<WorkOrderData[]>([])
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [pmStats, setPmStats] = useState<PMStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [detailedReportLoading, setDetailedReportLoading] = useState(false)
  const [showAlerts, setShowAlerts] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, hydrated, router])

  // Set mounted state after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return // Don't load data if not authenticated
    
    const token = localStorage.getItem('token')
    if (token) setAuthToken(token)
    loadDashboardData()
  }, [isAuthenticated])

  async function loadDashboardData() {
    try {
      setLoading(true)
      const [
        kpisRes,
        entiteRes,
        categorieRes,
        validationRes,
        etatRes,
        marqueRes,
        activityRes,
        workOrderRes,
        healthRes,
        pmStatsRes
      ] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/entite'),
        api.get('/dashboard/categorie'),
        api.get('/dashboard/validation'),
        api.get('/dashboard/etat'),
        api.get('/dashboard/marque'),
        api.get('/dashboard/activity'),
        api.get('/dashboard/work-orders/monthly'),
        api.get('/dashboard/health-score'),
        api.get('/dashboard/pm-stats')
      ])

      setKpis(kpisRes.data)
      setEntiteData(entiteRes.data.map((item: any) => ({
        name: item.Entite || 'Non défini',
        value: item._count._all
      })))
      setCategorieData(categorieRes.data.map((item: any) => ({
        name: item.Categorie,
        value: item._count._all
      })))
      setValidationData(validationRes.data.map((item: any) => ({
        name: item.Validation,
        value: item._count._all,
        color: STATUS_COLORS[item.Validation as keyof typeof STATUS_COLORS] || '#6B7280'
      })))
      setEtatData(etatRes.data.map((item: any) => ({
        name: item.Etat || 'Non défini',
        value: item._count._all
      })))
      setMarqueData(marqueRes.data.map((item: any) => ({
        name: item.Marque || 'Non définie',
        value: item._count._all
      })))
      setActivityData(activityRes.data)
      setWorkOrderData(workOrderRes.data)
      setHealthData(healthRes.data)
      setPmStats(pmStatsRes.data)
    } catch (error) {
      logger.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    setReportLoading(true)
    try {
      // Generate report data
      const reportData = {
        date: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        kpis,
        healthData,
        pmStats,
        charts: {
          entiteData,
          categorieData,
          validationData,
          etatData,
          marqueData
        }
      }

      // Create CSV content
      let csvContent = "Rapport Tableau de Bord SBS Maintenance\n"
      csvContent += `Généré le: ${reportData.date}\n\n`
      
      if (kpis) {
        csvContent += "=== INDICATEURS CLÉS ===\n"
        csvContent += `Actifs totaux,${kpis.actifsTotal}\n`
        csvContent += `Actifs confirmes (OK),${kpis.actifsOK}\n`
        csvContent += `Actifs à vérifier,${kpis.actifsAVerifier}\n`
        csvContent += `Actifs non confirmes,${kpis.actifsNonConformes}\n\n`
      }

      if (healthData) {
        csvContent += "=== SCORE DE SANTÉ ===\n"
        csvContent += `Score global,${healthData.healthScore}%\n`
        csvContent += `Total actifs,${healthData.total}\n`
        csvContent += `Confirmes,${healthData.breakdown.ok}\n`
        csvContent += `À vérifier,${healthData.breakdown.aVerifier}\n`
        csvContent += `Non confirmes,${healthData.breakdown.nonConforme}\n\n`
      }

      if (categorieData.length > 0) {
        csvContent += "=== RÉPARTITION PAR CATÉGORIE ===\n"
        categorieData.forEach(item => {
          csvContent += `${item.name},${item.value}\n`
        })
        csvContent += "\n"
      }

      if (validationData.length > 0) {
        csvContent += "=== RÉPARTITION PAR STATUT ===\n"
        validationData.forEach(item => {
          csvContent += `${item.name},${item.value}\n`
        })
        csvContent += "\n"
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `rapport-dashboard-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      logger.error('Error generating report:', error)
    } finally {
      setReportLoading(false)
    }
  }

  const generateDetailedHealthReport = async () => {
    setDetailedReportLoading(true)
    try {
      // Fetch detailed asset data for health analysis
      const response = await api.get('/assets')
      const assets = response.data

      const reportData = {
        date: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        healthData,
        detailedAssets: assets
      }

      // Create detailed CSV content
      let csvContent = "Rapport Détaillé - Score de Santé des Actifs\n"
      csvContent += `Généré le: ${reportData.date}\n\n`
      
      if (healthData) {
        csvContent += "=== RÉSUMÉ EXÉCUTIF ===\n"
        csvContent += `Score de santé global,${healthData.healthScore}%\n`
        csvContent += `Total des actifs analysés,${healthData.total}\n`
        csvContent += `Taux de conformité,${Math.round((healthData.breakdown.ok / healthData.total) * 100)}%\n`
        csvContent += `Actifs nécessitant une attention,${healthData.breakdown.aVerifier + healthData.breakdown.nonConforme}\n\n`

        csvContent += "=== RÉPARTITION DÉTAILLÉE ===\n"
        csvContent += `Statut,Nombre,Pourcentage\n`
        csvContent += `Conformes,${healthData.breakdown.ok},${Math.round((healthData.breakdown.ok / healthData.total) * 100)}%\n`
        csvContent += `À vérifier,${healthData.breakdown.aVerifier},${Math.round((healthData.breakdown.aVerifier / healthData.total) * 100)}%\n`
        csvContent += `Non confirmes,${healthData.breakdown.nonConforme},${Math.round((healthData.breakdown.nonConforme / healthData.total) * 100)}%\n\n`
      }

      // Add detailed asset list
      if (assets && assets.length > 0) {
        csvContent += "=== LISTE DÉTAILLÉE DES ACTIFS ===\n"
        csvContent += "Nom,Catégorie,Marque,Modèle,Série,Entité,Statut,État,Localisation\n"
        
        assets.forEach((asset: any) => {
          csvContent += `"${asset.Nom || 'N/A'}","${asset.Categorie || 'N/A'}","${asset.Marque || 'N/A'}","${asset.Modele || 'N/A'}","${asset.NumeroSerie || 'N/A'}","${asset.Entite || 'N/A'}","${asset.Validation || 'N/A'}","${asset.Etat || 'N/A'}","${asset.Localisation || 'N/A'}"\n`
        })
        csvContent += "\n"

        // Add analysis by category
        const categoryStats = assets.reduce((acc: any, asset: any) => {
          const category = asset.Categorie || 'Non définie'
          const status = asset.Validation || 'Non défini'
          
          if (!acc[category]) {
            acc[category] = { total: 0, OK: 0, A_verifier: 0, Non_conforme: 0 }
          }
          
          acc[category].total++
          if (status === 'OK') acc[category].OK++
          else if (status === 'A_verifier') acc[category].A_verifier++
          else if (status === 'Non_conforme') acc[category].Non_conforme++
          
          return acc
        }, {})

        csvContent += "=== ANALYSE PAR CATÉGORIE ===\n"
        csvContent += "Catégorie,Total,Confirmes,À vérifier,Non confirmes,Taux confirmité\n"
        
        Object.entries(categoryStats).forEach(([category, stats]: [string, any]) => {
          const complianceRate = Math.round((stats.OK / stats.total) * 100)
          csvContent += `"${category}",${stats.total},${stats.OK},${stats.A_verifier},${stats.Non_conforme},${complianceRate}%\n`
        })
        csvContent += "\n"

        // Add recommendations
        csvContent += "=== RECOMMANDATIONS ===\n"
        if (healthData) {
          if (healthData.healthScore >= 90) {
            csvContent += "- Excellent score de santé. Maintenir les bonnes pratiques.\n"
          } else if (healthData.healthScore >= 75) {
            csvContent += "- Bon score de santé. Concentrer les efforts sur les actifs à vérifier.\n"
          } else if (healthData.healthScore >= 60) {
            csvContent += "- Score de santé moyen. Plan d'action requis pour les actifs non confirmes.\n"
          } else {
            csvContent += "- Score de santé critique. Intervention urgente requise.\n"
          }
          
          if (healthData.breakdown.nonConforme > 0) {
            csvContent += `- ${healthData.breakdown.nonConforme} actifs non confirmes nécessitent une action immédiate.\n`
          }
          
          if (healthData.breakdown.aVerifier > 0) {
            csvContent += `- ${healthData.breakdown.aVerifier} actifs à vérifier dans les prochaines semaines.\n`
          }
        }
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `rapport-sante-detaille-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error generating detailed health report:', error)
    } finally {
      setDetailedReportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="p-8 max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="space-y-8"
          >
            {/* Loading header */}
            <div className="space-y-4">
              <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-100 rounded-2xl w-80 animate-pulse"></div>
              <div className="h-5 bg-slate-100 rounded-xl w-96 animate-pulse"></div>
            </div>
            
            {/* Loading cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-sm shadow-soft h-32 animate-pulse"
                >
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-slate-200 rounded-lg w-3/4"></div>
                    <div className="h-8 bg-slate-200 rounded-lg w-1/2"></div>
                    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Loading charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-sm shadow-soft h-80 animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="h-5 bg-slate-200 rounded-lg w-1/3"></div>
                  <div className="h-60 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-sm shadow-soft h-80 animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="h-5 bg-slate-200 rounded-lg w-1/3"></div>
                  <div className="h-60 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Professional Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-brand-800 to-slate-900 bg-clip-text text-transparent">
              Tableau de Bord
            </h1>
            <p className="text-slate-600 text-lg">
              Gestion intelligente de vos actifs IT • Maintenance préventive • Analytiques en temps réel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={loadDashboardData}
              loading={loading}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              Actualiser
            </Button>
            <Button 
              variant="default" 
              size="lg"
              onClick={generateReport}
              loading={reportLoading}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Rapport
            </Button>
          </div>
        </motion.div>

        {/* Smart Alerts Banner */}
        <AnimatePresence>
          {showAlerts && kpis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {kpis.woEnRetard > 0 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-red-500 rounded-full p-1.5">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-900 text-sm">
                        {kpis.woEnRetard} ordre{kpis.woEnRetard > 1 ? 's' : ''} de travail en retard
                      </h3>
                      <p className="text-red-600 text-xs mt-0.5">
                        Action requise immédiate
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/workorders?statut=En retard')}
                      className="bg-white hover:bg-red-50 text-red-700 border-red-300 text-xs px-3 py-1 h-7"
                    >
                      Voir
                    </Button>
                    <button
                      onClick={() => setShowAlerts(false)}
                      className="text-red-400 hover:text-red-600 p-0.5"
                      aria-label="Fermer l'alerte"
                      title="Fermer"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {kpis.actifsAVerifier > 5 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 rounded-lg p-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-amber-500 rounded-full p-1.5">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 text-sm">
                        {kpis.actifsAVerifier} actifs nécessitent une vérification
                      </h3>
                      <p className="text-amber-600 text-xs mt-0.5">
                        Validation en attente
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/assets?Validation=A_verifier')}
                    className="bg-white hover:bg-amber-50 text-amber-700 border-amber-300 text-xs px-3 py-1 h-7"
                  >
                    Vérifier
                  </Button>
                </motion.div>
              )}

              {kpis.woOuverts > 0 && kpis.woEnRetard === 0 && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg p-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-blue-500 rounded-full p-1.5">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 text-sm">
                        {kpis.woOuverts} ordre{kpis.woOuverts > 1 ? 's' : ''} de travail en cours
                      </h3>
                      <p className="text-blue-600 text-xs mt-0.5">
                        Toutes les tâches sont à jour 🎯
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Action Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/workorders')}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-left shadow-lg hover:shadow-xl transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 w-fit mb-3">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Créer Ordre de Travail</h3>
              <p className="text-blue-100 text-sm">Nouvelle tâche de maintenance</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/assets')}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-left shadow-lg hover:shadow-xl transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 w-fit mb-3">
                <Server className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Ajouter Actif</h3>
              <p className="text-emerald-100 text-sm">Enregistrer équipement IT</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/pmplans')}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-left shadow-lg hover:shadow-xl transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 w-fit mb-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Plans de Maintenance</h3>
              <p className="text-purple-100 text-sm">Programmation préventive</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateReport}
            disabled={reportLoading}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-left shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 w-fit mb-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Générer Rapport</h3>
              <p className="text-amber-100 text-sm">Export CSV complet</p>
            </div>
          </motion.button>
        </motion.div>

        {/* Professional KPI Cards */}
        {kpis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <StatsCard
              title="Actifs totaux"
              value={kpis.actifsTotal}
              description="Équipements IT enregistrés"
              icon={<Server className="h-6 w-6" />}
              trend={(() => {
                if (typeof kpis.woCreated30 === 'number' && typeof kpis.woCreatedPrev30 === 'number') {
                  const prev = Math.max(1, kpis.woCreatedPrev30 || 0)
                  const diff = (kpis.woCreated30 || 0) - prev
                  const pct = Math.round((diff / prev) * 100)
                  return pct >= 0 ? "up" : "down"
                }
                return "stable"
              })()}
              trendValue={(() => {
                if (typeof kpis.woCreated30 === 'number' && typeof kpis.woCreatedPrev30 === 'number') {
                  const prev = Math.max(1, kpis.woCreatedPrev30 || 0)
                  const diff = (kpis.woCreated30 || 0) - prev
                  const pct = Math.round((diff / prev) * 100)
                  return `${pct >= 0 ? '+' : ''}${pct}% (30j)`
                }
                return undefined
              })()}
              variant="gradient"
              onClick={() => router.push('/assets')}
              className="cursor-pointer"
            />

            <StatsCard
              title="Actifs confirmes"
              value={kpis.actifsOK}
              description={`${kpis.actifsTotal > 0 ? Math.round((kpis.actifsOK / kpis.actifsTotal) * 100) : 0}% du parc`}
              icon={<CheckCircle className="h-6 w-6" />}
              variant="success"
              onClick={() => router.push('/assets?Validation=OK')}
              className="cursor-pointer"
            />

            <StatsCard
              title="À vérifier"
              value={kpis.actifsAVerifier}
              description={`${kpis.actifsTotal > 0 ? Math.round((kpis.actifsAVerifier / kpis.actifsTotal) * 100) : 0}% nécessitent attention`}
              icon={<AlertTriangle className="h-6 w-6" />}
              variant="warning"
              onClick={() => router.push('/assets?Validation=A_verifier')}
              className="cursor-pointer"
            />

            <StatsCard
              title="Non confirmes"
              value={kpis.actifsNonConformes}
              description={`${kpis.actifsTotal > 0 ? Math.round((kpis.actifsNonConformes / kpis.actifsTotal) * 100) : 0}% à corriger`}
              icon={<XCircle className="h-6 w-6" />}
              variant="danger"
              onClick={() => router.push('/assets?Validation=Non_conforme')}
              className="cursor-pointer"
            />
          </motion.div>
        )}

      {/* Health Score - Professional Design */}
      {healthData && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        >
          <Card variant="gradient" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success-100 rounded-2xl">
                  <Shield className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Score de santé des actifs</h3>
                  <p className="text-slate-600">Indicateur global de conformité</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-success-600 to-success-700 bg-clip-text text-transparent">
                  {healthData.healthScore}%
                </div>
                <p className="text-sm text-slate-600">Score global</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Circular Progress */}
              <div className="flex items-center justify-center">
                <CircularProgress
                  value={healthData.healthScore}
                  size={160}
                  strokeWidth={12}
                  label={`Basé sur ${healthData.total} actifs`}
                  showValue={true}
                />
              </div>

              {/* Breakdown Stats */}
              <div className="space-y-6">
                {/* Confirmes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success-600" />
                      <span className="font-medium text-slate-700">Actifs confirmes</span>
                    </div>
                    <span className="font-semibold text-success-700">{healthData.breakdown.ok}</span>
                  </div>
                  <Progress 
                    value={healthData.breakdown.ok} 
                    max={healthData.total}
                    variant="success"
                    size="sm"
                  />
                </div>

                {/* À vérifier */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning-600" />
                      <span className="font-medium text-slate-700">À vérifier</span>
                    </div>
                    <span className="font-semibold text-warning-700">{healthData.breakdown.aVerifier}</span>
                  </div>
                  <Progress 
                    value={healthData.breakdown.aVerifier} 
                    max={healthData.total}
                    variant="warning"
                    size="sm"
                  />
                </div>

                {/* Non confirmes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-danger-600" />
                      <span className="font-medium text-slate-700">Non confirmes</span>
                    </div>
                    <span className="font-semibold text-danger-700">{healthData.breakdown.nonConforme}</span>
                  </div>
                  <Progress 
                    value={healthData.breakdown.nonConforme} 
                    max={healthData.total}
                    variant="danger"
                    size="sm"
                  />
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={generateDetailedHealthReport}
                    loading={detailedReportLoading}
                  >
                    <Gauge className="h-4 w-4 mr-2" />
                    Rapport détaillé
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Asset Counts by Category */}
      {kpis?.assetsByCategory && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
          <Card>
            <CardHeader>
              <CardTitle>Comptage des actifs par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Laptops</p>
                      <p className="text-2xl font-bold text-blue-600">{kpis.assetsByCategory.Laptop}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Imprimantes</p>
                      <p className="text-2xl font-bold text-purple-600">{kpis.assetsByCategory.Imprimante}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Serveurs</p>
                      <p className="text-2xl font-bold text-green-600">{kpis.assetsByCategory.Serveur}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Micro-ordinateurs</p>
                      <p className="text-2xl font-bold text-orange-600">{kpis.assetsByCategory.Micro_ordinateur}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* PM Plan Periodicity Breakdown */}
      {pmStats && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
          <Card>
            <CardHeader>
              <CardTitle>Périodicité des plans de maintenance (PM)</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {pmStats.totalActivePlans} plan{pmStats.totalActivePlans > 1 ? 's' : ''} actif{pmStats.totalActivePlans > 1 ? 's' : ''}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-700">MIS (Mensuel)</span>
                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded">1 mois</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{pmStats.byPeriodicity.MIS.count}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {pmStats.byPeriodicity.MIS.totalWorkOrders} ordre{pmStats.byPeriodicity.MIS.totalWorkOrders > 1 ? 's' : ''} générés
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-700">TRI (Trimestriel)</span>
                    <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded">3 mois</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{pmStats.byPeriodicity.TRI.count}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {pmStats.byPeriodicity.TRI.totalWorkOrders} ordre{pmStats.byPeriodicity.TRI.totalWorkOrders > 1 ? 's' : ''} générés
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-purple-700">SEMESTRE (Semestriel)</span>
                    <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded">6 mois</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{pmStats.byPeriodicity.SEMESTRE.count}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {pmStats.byPeriodicity.SEMESTRE.totalWorkOrders} ordre{pmStats.byPeriodicity.SEMESTRE.totalWorkOrders > 1 ? 's' : ''} générés
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-orange-700">ANNUEL (Annuel)</span>
                    <span className="text-xs bg-orange-200 text-orange-700 px-2 py-1 rounded">12 mois</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-600">{pmStats.byPeriodicity.ANNUEL.count}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {pmStats.byPeriodicity.ANNUEL.totalWorkOrders} ordre{pmStats.byPeriodicity.ANNUEL.totalWorkOrders > 1 ? 's' : ''} générés
                  </p>
                </div>
              </div>

              {pmStats.upcomingMaintenance.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Maintenance à venir (30 prochains jours)</h4>
                  <div className="space-y-2">
                    {pmStats.upcomingMaintenance.slice(0, 5).map((pm) => (
                      <div key={pm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{pm.name}</p>
                          <p className="text-xs text-gray-500">
                            Périodicité: {pm.periodicite}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pm.daysUntil <= 7 ? 'bg-red-100 text-red-800' : 
                            pm.daysUntil <= 14 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            Dans {pm.daysUntil} jour{pm.daysUntil > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Mini Calendar Widget - Upcoming Maintenance */}
      {pmStats && pmStats.upcomingMaintenance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Calendrier de Maintenance</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">Prochaines interventions programmées</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/pmplans')}
                >
                  Voir tous les plans
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-slate-200">
                {pmStats.upcomingMaintenance.slice(0, 8).map((pm, index) => {
                  const urgency = pm.daysUntil <= 7 ? 'urgent' : pm.daysUntil <= 14 ? 'soon' : 'normal'
                  const colors = {
                    urgent: 'from-red-50 to-red-100 border-red-200',
                    soon: 'from-amber-50 to-amber-100 border-amber-200',
                    normal: 'from-blue-50 to-blue-100 border-blue-200'
                  }
                  const textColors = {
                    urgent: 'text-red-900',
                    soon: 'text-amber-900',
                    normal: 'text-blue-900'
                  }
                  const badgeColors = {
                    urgent: 'bg-red-500 text-white',
                    soon: 'bg-amber-500 text-white',
                    normal: 'bg-blue-500 text-white'
                  }

                  return (
                    <motion.div
                      key={pm.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`bg-gradient-to-br ${colors[urgency]} border-2 p-4 hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => router.push('/pmplans')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={`${badgeColors[urgency]} text-xs font-bold px-2 py-1 rounded-full`}>
                          {pm.daysUntil}J
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">
                          {pm.periodicite}
                        </div>
                      </div>
                      <h4 className={`font-semibold text-sm ${textColors[urgency]} mb-1 line-clamp-2`}>
                        {pm.name}
                      </h4>
                      <p className="text-xs text-slate-600">
                        {format(parseISO(pm.nextRunAt), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories Distribution - Interactive */}
        {mounted && categorieData.length > 0 && (
        <ChartCard title="Répartition par catégorie" heightClass="h-[300px]" description="Cliquez sur une section pour filtrer">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categorieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const name = props.name as string
                  const percent = Number(props.percent ?? 0)
                  return `${name} ${(percent * 100).toFixed(0)}%`
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                onClick={(data) => {
                  if (data && data.name) {
                    router.push(`/assets?Categorie=${encodeURIComponent(data.name)}`)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {categorieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                        <p className="font-semibold text-slate-900">{payload[0].name}</p>
                        <p className="text-sm text-slate-600">{payload[0].value} actifs</p>
                        <p className="text-xs text-blue-600 mt-1">📊 Cliquez pour filtrer</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        )}

        {/* Validation Status */}
        {mounted && validationData.length > 0 && (
        <ChartCard title="État de validation" heightClass="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={validationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {validationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        )}

        {/* Activity */}
        {mounted && activityData.length > 0 && (
        <ChartCard title="Activité des 30 derniers jours" heightClass="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(parseISO(value), 'dd/MM', { locale: fr })}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => format(parseISO(value as string), 'dd MMMM yyyy', { locale: fr })}
                formatter={(value) => [value as number, 'Actifs créés']}
              />
              <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        )}

        {/* Top Brands */}
        {mounted && marqueData.length > 0 && (
        <ChartCard title="Top 10 marques" heightClass="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={marqueData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        )}
      </div>

      {/* Entity Distribution */}
      {mounted && entiteData.length > 0 && (
      <ChartCard title="Répartition par entité" heightClass="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entiteData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      )}

      {/* Work Orders Monthly Trend */}
      {mounted && workOrderData.length > 0 && (
        <ChartCard title="Évolution des ordres de travail (12 derniers mois)" heightClass="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={workOrderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(value) => format(parseISO(value + '-01'), 'MMM yyyy', { locale: fr })}
              />
              <YAxis />
              <Tooltip labelFormatter={(value) => format(parseISO(value + '-01'), 'MMMM yyyy', { locale: fr })} />
              <Legend />
              <Line type="monotone" dataKey="created" stroke="#8884d8" name="Créés" />
              <Line type="monotone" dataKey="completed" stroke="#82ca9d" name="Terminés" />
              <Line type="monotone" dataKey="overdue" stroke="#ff7300" name="En retard" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
      </div>
    </div>
  )
}