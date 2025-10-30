'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { History, Calendar, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from './api';

interface AuditLog {
  id: string;
  action: string;
  changedBy: string;
  userName: string;
  userRole: string;
  changedAt: string;
  changes: any;
  ipAddress?: string;
}

interface AssetHistoryProps {
  matricule: string;
}

export function AssetHistory({ matricule }: AssetHistoryProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [matricule]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/dashboard/audit-logs/assets/${matricule}`);
      // The API returns { asset, logs, total }, so we need to extract the logs array
      const logsData = response.data.logs || [];
      if (Array.isArray(logsData)) {
        setLogs(logsData);
      } else {
        console.error('Logs data is not an array:', logsData);
        setLogs([]);
        setError('Format de données incorrect');
      }
    } catch (error) {
      console.error('Error loading asset history:', error);
      setLogs([]);
      setError('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-600" />
            Historique des modifications
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadHistory}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-4" />
            <p className="text-slate-600">Chargement de l'historique...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-danger-600 font-medium mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={loadHistory}>
              Réessayer
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Aucune modification enregistrée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {getActionLabel(log.action)}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {new Date(log.changedAt).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      leftIcon={
                        expandedLog === log.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      }
                    >
                      {expandedLog === log.id ? 'Masquer' : 'Détails'}
                    </Button>
                  )}
                </div>

                {/* TECHNICIEN INFORMATION - HIGHLIGHTED */}
                <div className="flex items-center gap-3 mb-2 bg-brand-50 border border-brand-200 px-3 py-2 rounded-lg">
                  <User className="h-4 w-4 text-brand-600" />
                  <span className="font-semibold text-brand-900">
                    {log.userName}
                  </span>
                  <Badge variant={getRoleBadgeVariant(log.userRole)}>
                    {getRoleLabel(log.userRole)}
                  </Badge>
                  {log.changes && (
                    <span className="text-sm text-slate-600 ml-auto">
                      {Object.keys(log.changes).length} champ(s) modifié(s)
                    </span>
                  )}
                </div>

                {log.ipAddress && (
                  <div className="text-xs text-slate-500 mb-2">
                    IP: {log.ipAddress}
                  </div>
                )}

                <AnimatePresence>
                  {expandedLog === log.id && log.changes && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-4 border-t border-slate-200"
                    >
                      <div className="space-y-3">
                        {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                          <div key={field} className="bg-white border-l-4 border-brand-500 rounded-lg p-3 shadow-sm">
                            <div className="font-semibold text-slate-900 mb-3 text-sm">
                              📝 {field}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-danger-700 font-medium block mb-1 uppercase tracking-wide">
                                  ❌ Avant
                                </span>
                                <div className="p-2 bg-danger-50 border-2 border-danger-200 rounded font-mono text-danger-800">
                                  {change.oldValue || 'Non défini'}
                                </div>
                              </div>
                              <div>
                                <span className="text-success-700 font-medium block mb-1 uppercase tracking-wide">
                                  ✅ Après
                                </span>
                                <div className="p-2 bg-success-50 border-2 border-success-200 rounded font-mono text-success-800">
                                  {change.newValue || 'Non défini'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
