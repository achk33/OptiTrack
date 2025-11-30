import { z } from 'zod';

// Sanitize string inputs to prevent XSS and injection attacks
const sanitizeString = (str: string | null | undefined): string | null | undefined => {
  if (!str) return str;
  // Remove potentially dangerous characters while preserving useful ones
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

const nullableString = z.string()
  .nullish()
  .transform(sanitizeString);

const requiredSanitizedString = z.string()
  .min(1, 'This field is required')
  .transform(sanitizeString);

export const AssetCreateSchema = z.object({
  Matricule: z.string()
    .min(1, 'Matricule is required')
    .max(50, 'Matricule must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Matricule can only contain letters, numbers, hyphens, and underscores'),
  NomPrenom: z.string()
    .max(100, 'Name must be less than 100 characters')
    .nullish()
    .transform(sanitizeString),
  Entite: z.string()
    .max(100, 'Entite must be less than 100 characters')
    .nullish()
    .transform(sanitizeString),
  Categorie: z.enum(['Micro_ordinateur','Laptop','Serveur','Imprimante','Autre','PC']),
  Marque: z.string()
    .max(50, 'Marque must be less than 50 characters')
    .nullish()
    .transform(sanitizeString),
  Modele: z.string()
    .max(100, 'Modele must be less than 100 characters')
    .nullish()
    .transform(sanitizeString),
  Code: z.string()
    .max(50, 'Code must be less than 50 characters')
    .nullish()
    .transform(sanitizeString),
  SerialNumber: z.string()
    .max(100, 'Serial number must be less than 100 characters')
    .nullish()
    .transform(sanitizeString),
  Etat: z.enum(['En_service','Hors_service','En_maintenance','Mis_au_rebut']).nullish(),
  Validation: z.enum(['OK','A_verifier','Non_conforme','Conforme','En_attente']).nullish(),
  Remarque: z.string()
    .max(1000, 'Remarque must be less than 1000 characters')
    .nullish()
    .transform(sanitizeString),
  DateDePassage: z.string().datetime().nullish(),
});

export const AssetUpdateSchema = AssetCreateSchema.partial();

export const WorkOrderUpdateSchema = z.object({
  taches: z.any().optional(),
  priorite: z.enum(['Basse','Moyenne','Haute']).optional(),
  assigne: z.string()
    .max(100, 'Assigne must be less than 100 characters')
    .optional()
    .transform(sanitizeString),
  echeance: z.string().datetime().optional(),
  statut: z.enum(['Ouvert','En cours','Terminé','En attente']).optional(),
  commentaires: z.any().optional(),
  tempsPasse: z.number().int().min(0).max(86400, 'Time cannot exceed 24 hours').optional(),
  attachments: z.any().optional(),
});

// User input validation
export const UserCreateSchema = z.object({
  email: z.string().email('Invalid email address').max(100),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform(sanitizeString),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .transform(sanitizeString),
  role: z.enum(['ADMIN', 'TECHNICIEN', 'LECTEUR']).optional(),
});

// PM Plan validation
export const PMPlanCreateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .transform(sanitizeString),
  scopeType: z.string().max(50),
  scopeValue: z.string()
    .max(100)
    .transform(sanitizeString),
  periodicite: z.enum(['MIS', 'TRI', 'SEMESTRE', 'ANNUEL']),
  taches: z.array(z.any()),
  ownerRole: z.enum(['ADMIN', 'TECHNICIEN', 'LECTEUR']),
  active: z.boolean().optional(),
});
