'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge, StatusBadge } from '../../../components/ui/badge';
import { Input, SearchInput } from '../../../components/ui/input';
import { 
  History, 
  Filter, 
  Download, 
  Calendar,
  User,
  FileEdit,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../components/api';

interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  changedBy: string;
  userName: string;
  userRole: string;
  changedAt: string;
  oldValues: any;
  newValues: any;
  changes: any;
  ipAddress?: string;
  asset?: {
    Matricule: string;
    NomPrenom: string;
    Entite: string;
    Categorie: string;
  };
}

interface AuditStats {
  totalChanges: number;
  changesByAction: Array<{ action: string; count: number }>;
  changesByUser: Array<{ userId: string; userName: string; userRole: string; count: number }>;
  recentChanges: any[];
}

interface CleanupStats {
  total: number;
  last30Days: number;
  last7Days: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    assetId: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (user?.role === 'Admin') {
      loadAuditLogs();
      loadAuditStats();
      loadCleanupStats();
    }
  }, [user, page]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      });

      const response = await api.get(`/dashboard/audit-logs/assets?${queryParams}`);
      const data = response.data;
      
      // Ensure we have the expected data structure
      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        console.error('Unexpected API response format:', data);
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditStats = async () => {
    try {
      const response = await api.get('/dashboard/audit-logs/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading audit stats:', error);
    }
  };

  const loadCleanupStats = async () => {
    try {
      const response = await api.get('/admin/audit-logs/stats');
      setCleanupStats(response.data);
    } catch (error) {
      console.error('Error loading cleanup stats:', error);
    }
  };

  const handleCleanupAll = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS les logs d\'audit? Cette action est irréversible!')) {
      return;
    }

    setCleanupLoading(true);
    try {
      const response = await api.delete('/admin/audit-logs');
      alert(`✅ ${response.data.deletedCount} entrées supprimées avec succès`);
      setShowCleanupModal(false);
      loadAuditLogs();
      loadAuditStats();
      loadCleanupStats();
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      alert('❌ Erreur lors de la suppression');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleCleanupOld = async () => {
    if (!confirm('Supprimer tous les logs de plus de 30 jours?')) {
      return;
    }

    setCleanupLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const response = await api.delete(`/admin/audit-logs?olderThan=${thirtyDaysAgo.toISOString()}`);
      alert(`✅ ${response.data.deletedCount} entrées anciennes supprimées`);
      setShowCleanupModal(false);
      loadAuditLogs();
      loadAuditStats();
      loadCleanupStats();
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      alert('❌ Erreur lors de la suppression');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1); // Reset to first page when filtering
  };

  const applyFilters = () => {
    loadAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      assetId: '',
      action: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
    setPage(1);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create': return 'success';
      case 'update': return 'default';
      case 'delete': return 'danger';
      case 'soft-delete': return 'warning';
      case 'restore': return 'success';
      default: return 'default';
    }
  };

const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Création',
      update: 'Modification',
      delete: 'Suppression',
      'soft-delete': 'Mise au rebut',
      restore: 'Restauration',
    };
    return labels[action] || action;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrateur',
      TECHNICIEN: 'Technicien',
      VIEWER: 'Lecteur',
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'TECHNICIEN': return 'success';
      case 'VIEWER': return 'default';
      default: return 'default';
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-16 w-16 text-danger-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Accès refusé</h1>
        <p className="text-slate-600">
          Vous n'avez pas les permissions nécessaires pour accéder au journal des modifications.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <History className="h-8 w-8 text-brand-600" />
            Journal des Modifications
          </h1>
          <p className="text-slate-600 mt-1">
            Suivi détaillé de toutes les modifications apportées aux actifs
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCleanupModal(true)} 
            variant="outline" 
            leftIcon={<Trash2 className="h-4 w-4" />}
            className="text-danger-600 border-danger-300 hover:bg-danger-50"
          >
            Nettoyer
          </Button>
          <Button onClick={loadAuditLogs} variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="elevated" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Modifications (30j)</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalChanges}</p>
              </div>
              <div className="h-12 w-12 bg-brand-100 rounded-xl flex items-center justify-center">
                <FileEdit className="h-6 w-6 text-brand-600" />
              </div>
            </div>
          </Card>

          <Card variant="elevated" className="p-6">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-3">Par type d'action</p>
              <div className="space-y-2">
                {stats.changesByAction.slice(0, 3).map((item) => (
                  <div key={item.action} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{getActionLabel(item.action)}</span>
                    <span className="font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card variant="elevated" className="p-6">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-3">Utilisateurs actifs</p>
              <div className="space-y-2">
                {stats.changesByUser.slice(0, 3).map((item) => (
                  <div key={item.userId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{item.userName}</span>
                    <span className="font-semibold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Filtres</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Matricule actif"
            value={filters.assetId}
            onChange={(e) => handleFilterChange('assetId', e.target.value)}
          />
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            aria-label="Filtrer par type d'action"
          >
            <option value="">Toutes les actions</option>
            <option value="create">Création</option>
            <option value="update">Modification</option>
            <option value="delete">Suppression</option>
            <option value="soft-delete">Mise au rebut</option>
            <option value="restore">Restauration</option>
          </select>
          <Input
            type="date"
            placeholder="Date début"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
          <Input
            type="date"
            placeholder="Date fin"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={applyFilters} variant="default" className="flex-1">
              Appliquer
            </Button>
            <Button onClick={clearFilters} variant="outline" className="flex-1">
              Effacer
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historique des modifications ({total})</span>
            <Badge variant="default">{total} entrées</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-4" />
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Aucune modification trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Asset Information */}
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="font-medium text-slate-900">
                          {log.asset?.NomPrenom || log.entityId}
                        </span>
                        <span className="text-sm text-slate-500">
                          ({log.asset?.Matricule || log.entityId})
                        </span>
                      </div>
                      
                      {/* TECHNICIEN INFORMATION - HIGHLIGHTED */}
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 px-4 py-2 rounded-lg">
                          <User className="h-5 w-5 text-brand-600" />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-brand-900">
                              {log.userName}
                            </span>
                            <Badge variant={getRoleBadgeVariant(log.userRole)} className="ml-1">
                              {getRoleLabel(log.userRole)}
                            </Badge>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-sm text-slate-600">
                          <Calendar className="h-4 w-4" />
                          {new Date(log.changedAt).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Changed Fields Summary */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium text-slate-700">
                            {Object.keys(log.changes).length} champ(s) modifié(s):
                          </span>{' '}
                          <span className="text-slate-600">
                            {Object.keys(log.changes).slice(0, 3).join(', ')}
                            {Object.keys(log.changes).length > 3 && '...'}
                          </span>
                        </div>
                      )}

                      {/* IP Address */}
                      {log.ipAddress && (
                        <div className="mt-1 text-xs text-slate-500">
                          IP: {log.ipAddress}
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
                      Détails
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Page {page} sur {totalPages} • {total} entrées
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  rightIcon={<ChevronRight className="h-4 w-4" />}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Détails de la modification</h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                    ✕
                  </Button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                <div className="space-y-6">
                  {/* TECHNICIEN INFO - MOST PROMINENT */}
                  <div className="bg-gradient-to-r from-brand-50 to-brand-100 border-2 border-brand-300 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 bg-brand-600 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-brand-700 font-medium mb-1">Modifié par</p>
                        <p className="text-xl font-bold text-brand-900">{selectedLog.userName}</p>
                      </div>
                      <Badge variant={getRoleBadgeVariant(selectedLog.userRole)} className="ml-auto">
                        {getRoleLabel(selectedLog.userRole)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-brand-600" />
                        <span className="text-brand-800">
                          {new Date(selectedLog.changedAt).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {selectedLog.ipAddress && (
                        <div className="text-brand-700">
                          <span className="font-medium">IP:</span> {selectedLog.ipAddress}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Info */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Type d'action</h3>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} className="text-base px-4 py-2">
                      {getActionLabel(selectedLog.action)}
                    </Badge>
                  </div>

                  {/* Asset Info */}
                  {selectedLog.asset && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Actif concerné</h3>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-600">Matricule:</span>
                            <span className="ml-2 font-medium">{selectedLog.asset.Matricule}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Nom:</span>
                            <span className="ml-2 font-medium">{selectedLog.asset.NomPrenom}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Entité:</span>
                            <span className="ml-2 font-medium">{selectedLog.asset.Entite}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Catégorie:</span>
                            <span className="ml-2 font-medium">{selectedLog.asset.Categorie}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Changes - What Exactly Changed */}
                  {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <FileEdit className="h-5 w-5 text-brand-600" />
                        Champs modifiés ({Object.keys(selectedLog.changes).length})
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(selectedLog.changes).map(([field, change]: [string, any]) => (
                          <div key={field} className="bg-slate-50 border-l-4 border-brand-500 rounded-lg p-4">
                            <div className="font-semibold text-slate-900 mb-3 text-base">
                              📝 {field}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs font-medium text-danger-700 mb-2 uppercase tracking-wide">
                                  ❌ Ancienne valeur
                                </div>
                                <div className="p-3 bg-danger-50 border-2 border-danger-200 text-danger-900 rounded-lg font-mono text-sm">
                                  {change.oldValue || 'Non défini'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-success-700 mb-2 uppercase tracking-wide">
                                  ✅ Nouvelle valeur
                                </div>
                                <div className="p-3 bg-success-50 border-2 border-success-200 text-success-900 rounded-lg font-mono text-sm">
                                  {change.newValue || 'Non défini'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cleanup Modal */}
      <AnimatePresence>
        {showCleanupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !cleanupLoading && setShowCleanupModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-danger-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-danger-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Nettoyer les logs d'audit
                  </h2>
                  <p className="text-sm text-slate-600">
                    Cette action est irréversible
                  </p>
                </div>
              </div>

              {cleanupStats && (
                <div className="space-y-3 mb-6">
                  <p className="text-slate-700 font-medium">
                    Statistiques actuelles:
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Total des logs:</span>
                      <span className="font-semibold text-slate-900">{cleanupStats.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Derniers 7 jours:</span>
                      <span className="font-semibold text-success-600">{cleanupStats.last7Days}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Derniers 30 jours:</span>
                      <span className="font-semibold text-warning-600">{cleanupStats.last30Days}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Plus de 30 jours:</span>
                      <span className="font-semibold text-danger-600">
                        {cleanupStats.total - cleanupStats.last30Days}
                      </span>
                    </div>
                    {cleanupStats.oldestEntry && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-600 text-xs">Plus ancienne entrée: </span>
                        <span className="text-slate-900 text-xs font-medium">
                          {new Date(cleanupStats.oldestEntry).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleCleanupOld}
                  disabled={cleanupLoading}
                  variant="outline"
                  className="w-full border-warning-300 text-warning-700 hover:bg-warning-50"
                >
                  {cleanupLoading ? 'Suppression...' : 'Supprimer logs > 30 jours'}
                </Button>

                <Button
                  onClick={handleCleanupAll}
                  disabled={cleanupLoading}
                  variant="outline"
                  className="w-full border-danger-300 text-danger-700 hover:bg-danger-50"
                >
                  {cleanupLoading ? 'Suppression...' : 'Supprimer TOUS les logs'}
                </Button>

                <Button
                  onClick={() => setShowCleanupModal(false)}
                  disabled={cleanupLoading}
                  variant="ghost"
                  className="w-full"
                >
                  Annuler
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
