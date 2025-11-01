import { prisma } from '../db/client';

// Define field labels for better readability
const ASSET_FIELD_LABELS: Record<string, string> = {
  Matricule: 'Matricule',
  NomPrenom: 'Nom et Prénom',
  Entite: 'Entité',
  Categorie: 'Catégorie',
  Marque: 'Marque',
  Modele: 'Modèle',
  Code: 'Code',
  SerialNumber: 'Numéro de série',
  Etat: 'État',
  Validation: 'Validation',
  Remarque: 'Remarques',
  DateDePassage: 'Date de passage',
};

// State value translations for better display
const ETAT_LABELS: Record<string, string> = {
  'En_service': 'En service',
  'Hors_service': 'Hors service',
  'En_maintenance': 'En maintenance',
  'Mis_au_rebut': 'Mis au rebut',
};

const VALIDATION_LABELS: Record<string, string> = {
  'OK': 'Confirme',
  'A_verifier': 'A vérifier',
  'Non_conforme': 'Non confirme',
};

const CATEGORIE_LABELS: Record<string, string> = {
  'Micro_ordinateur': 'Micro-ordinateur',
  'Laptop': 'Laptop',
  'Serveur': 'Serveur',
  'Imprimante': 'Imprimante',
  'Autre': 'Autre',
};

// Track which fields to monitor for Asset changes
const TRACKED_ASSET_FIELDS = [
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
];

/**
 * Enhanced audit logging with detailed field-by-field change tracking
 */
export async function logAudit(
  entity: string,
  entityId: string,
  action: string,
  changedBy: string,
  diff: { before?: any; after?: any },
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    // Get user information for better audit trail
    const user = await prisma.user.findUnique({
      where: { id: changedBy },
      select: {
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
    const userRole = user?.role || 'Unknown';

    // Calculate detailed changes for UPDATE actions
    let changes: any = {};
    let oldValues: any = {};
    let newValues: any = {};

    if (action === 'update' && diff.before && diff.after) {
      const before = diff.before;
      const after = diff.after;

      // Track changes for each monitored field
      if (entity === 'Asset') {
        TRACKED_ASSET_FIELDS.forEach((field) => {
          const oldValue = before[field];
          const newValue = after[field];

          // Check if value actually changed
          if (oldValue !== newValue) {
            const fieldLabel = ASSET_FIELD_LABELS[field] || field;
            
            changes[fieldLabel] = {
              field: field,
              oldValue: formatValue(oldValue, field),
              newValue: formatValue(newValue, field),
            };

            oldValues[field] = oldValue;
            newValues[field] = newValue;
          }
        });
      }
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        changedBy,
        userName,
        userRole,
        changedAt: new Date(),
        oldValues: diff.before ? JSON.parse(JSON.stringify(diff.before)) : null,
        newValues: diff.after ? JSON.parse(JSON.stringify(diff.after)) : null,
        changes: Object.keys(changes).length > 0 ? changes : null,
        diff: diff as any, // Keep for backward compatibility
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    console.log(`✅ [AUDIT] ${userName} (${userRole}) - ${action} sur ${entity} ${entityId}`);
    if (Object.keys(changes).length > 0) {
      console.log(`   📝 ${Object.keys(changes).length} champ(s) modifié(s):`);
      Object.entries(changes).forEach(([label, change]: [string, any]) => {
        console.log(`      - ${label}: "${change.oldValue}" → "${change.newValue}"`);
      });
    }
  } catch (error) {
    console.error('❌ [AUDIT ERROR] Failed to log audit:', error);
    // Don't throw error to prevent breaking the main operation
  }
}

/**
 * Format values for display in audit log
 */
function formatValue(value: any, field?: string): string {
  if (value === null || value === undefined) {
    return 'Non défini';
  }
  if (value instanceof Date) {
    return value.toLocaleDateString('fr-FR');
  }
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  
  // Format enum values to French
  if (field === 'Etat' && ETAT_LABELS[value]) {
    return ETAT_LABELS[value];
  }
  if (field === 'Validation' && VALIDATION_LABELS[value]) {
    return VALIDATION_LABELS[value];
  }
  if (field === 'Categorie' && CATEGORIE_LABELS[value]) {
    return CATEGORIE_LABELS[value];
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(entity: string, entityId: string) {
  return await prisma.auditLog.findMany({
    where: {
      entity,
      entityId,
    },
    orderBy: {
      changedAt: 'desc',
    },
  });
}

/**
 * Get all audit logs with filtering
 */
export async function getAuditLogs(filters?: {
  entity?: string;
  action?: string;
  changedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const where: any = {};

  if (filters?.entity) where.entity = filters.entity;
  if (filters?.action) where.action = filters.action;
  if (filters?.changedBy) where.changedBy = filters.changedBy;
  if (filters?.startDate || filters?.endDate) {
    where.changedAt = {};
    if (filters.startDate) where.changedAt.gte = filters.startDate;
    if (filters.endDate) where.changedAt.lte = filters.endDate;
  }

  return await prisma.auditLog.findMany({
    where,
    orderBy: {
      changedAt: 'desc',
    },
    take: filters?.limit || 100,
  });
}
