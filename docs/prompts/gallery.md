# Prompts Gallery

Utilisez ces prompts structurés pour guider Copilot et obtenir des résultats fiables.

## Schéma d'actif
- Contexte: Import d'actifs depuis Excel avec en-têtes français.
- Objectif: Valider les champs requis et les enums.
- Sources: `samples/asset_import_template.csv`, schéma Prisma.
- Attentes: Avertir des doublons Matricule/SerialNumber, prévisualisation avant commit.

Prompt:
"""
Tu es mon pair-programmeur. Contexte: application SBS, import Excel pour actifs.
Tâche: écrire une fonction `normalizeRow()` qui mappe `Nom-Prenom` -> `NomPrenom` et `Serial Number` -> `SerialNumber`, trim tous les champs et valide enums Categorie/Etat/Validation.
Sources: utils/import.ts, schema.prisma.
Attentes: retourner un objet normalisé et une liste de warnings.
"""
