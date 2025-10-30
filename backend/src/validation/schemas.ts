import { z } from 'zod';

const nullableString = z.string().nullish();

export const AssetCreateSchema = z.object({
  Matricule: z.string().min(1),
  NomPrenom: nullableString,
  Entite: nullableString,
  Categorie: z.enum(['Micro_ordinateur','Laptop','Serveur','Imprimante','Autre','PC']),
  Marque: nullableString,
  Modele: nullableString,
  Code: nullableString,
  SerialNumber: nullableString,
  Etat: z.enum(['En_service','Hors_service','En_maintenance','Mis_au_rebut']).nullish(),
  Validation: z.enum(['OK','A_verifier','Non_conforme','Conforme','En_attente']).nullish(),
  Remarque: nullableString,
  DateDePassage: z.string().datetime().nullish(),
});

export const AssetUpdateSchema = AssetCreateSchema.partial();

export const WorkOrderUpdateSchema = z.object({
  taches: z.any().optional(),
  priorite: z.enum(['Basse','Moyenne','Haute']).optional(),
  assigne: z.string().optional(),
  echeance: z.string().datetime().optional(),
  statut: z.enum(['Ouvert','En cours','Terminé','En attente']).optional(),
  commentaires: z.any().optional(),
  tempsPasse: z.number().int().min(0).optional(),
  attachments: z.any().optional(),
});
