import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { exportToExcel } from '../utils/export';
import XLSX from 'xlsx';
import { parseBufferToRows, normalizeRow } from '../utils/import';
import { AssetCreateSchema, AssetUpdateSchema } from '../validation/schemas';

export const assetsRouter = Router();

assetsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { page = '1', pageSize = '20', q = '', Entite, Categorie, Etat, Validation, Code } = req.query as any;
  const take = Math.min(100, Number(pageSize));
  const skip = (Number(page) - 1) * take;
  const where: any = { deletedAt: null };
  if (q) where.OR = [
    { Matricule: { contains: q as string, mode: 'insensitive' } },
    { SerialNumber: { contains: q as string, mode: 'insensitive' } },
    { NomPrenom: { contains: q as string, mode: 'insensitive' } },
    { Code: { contains: q as string, mode: 'insensitive' } },
  ];
  if (Entite) where.Entite = String(Entite);
  if (Categorie) where.Categorie = String(Categorie);
  if (Etat) where.Etat = String(Etat).replace(' ', '_');
  if (Validation) where.Validation = String(Validation).replace(' ', '_');
  if (Code) where.Code = String(Code);
  const [items, total] = await Promise.all([
    prisma.asset.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' } }),
    prisma.asset.count({ where })
  ]);
  res.json({ items, total, page: Number(page), pageSize: take });
});

assetsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = req.params.id;
  const item = await prisma.asset.findUnique({ where: { Matricule: id } });
  if (!item || item.deletedAt) return res.status(404).json({ error: 'Introuvable' });
  res.json(item);
});

assetsRouter.post('/', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const parsed = AssetCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = { ...parsed.data } as any;
  data.Categorie = mapCategorie(data.Categorie);
  if (data.Validation) data.Validation = mapValidation(data.Validation);
  if (data.Etat) data.Etat = mapEtat(data.Etat);
  if (data.DateDePassage === '') data.DateDePassage = null;
  try {
    const created = await prisma.asset.create({ data });
    await logAudit('Asset', created.Matricule, 'create', req.user!.id, { after: created });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

assetsRouter.patch('/:id', requireAuth, requireRole('Admin', 'Technicien'), async (req: Request, res: Response) => {
  const id = req.params.id;
  const before = await prisma.asset.findUnique({ where: { Matricule: id } });
  if (!before) return res.status(404).json({ error: 'Introuvable' });
  const parsed = AssetUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = { ...parsed.data } as any;
  // Matricule can now be edited by Technicien
  if (data.Categorie) data.Categorie = mapCategorie(data.Categorie);
  if (data.Validation) data.Validation = mapValidation(data.Validation);
  if (data.Etat) data.Etat = mapEtat(data.Etat);
  if ('DateDePassage' in data && data.DateDePassage === '') data.DateDePassage = null;
  const updated = await prisma.asset.update({ where: { Matricule: id }, data });
  
  // Enhanced audit logging with IP and user agent
  await logAudit('Asset', id, 'update', req.user!.id, { before, after: updated }, {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
  
  res.json(updated);
});

assetsRouter.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const id = req.params.id;
  const before = await prisma.asset.findUnique({ where: { Matricule: id } });
  if (!before) return res.status(404).json({ error: 'Introuvable' });
  const updated = await prisma.asset.update({ where: { Matricule: id }, data: { deletedAt: new Date() } });
  await logAudit('Asset', id, 'soft-delete', req.user!.id, { before, after: updated });
  res.json({ ok: true });
});

assetsRouter.post('/:id/restore', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const id = req.params.id;
  const updated = await prisma.asset.update({ where: { Matricule: id }, data: { deletedAt: null } });
  await logAudit('Asset', id, 'restore', req.user!.id, { after: updated });
  res.json(updated);
});

assetsRouter.post('/import/preview', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const { fileBase64, mapping } = req.body as { fileBase64: string; mapping?: Record<string, string> };
  console.log('Preview request received, fileBase64 length:', fileBase64?.length);

  const buf = Buffer.from((fileBase64 || '').split(',').pop() || '', 'base64');
  console.log('Buffer created, size:', buf.length);

  const rawRows = parseBufferToRows(buf);
  const headersSet = new Set<string>();
  rawRows.forEach(r => Object.keys(r).forEach(k => headersSet.add(k)));
  const headers = Array.from(headersSet);

  const rowsForNormalize = (mapping && Object.keys(mapping).length)
    ? rawRows.map(r => applyMapping(r, mapping))
    : rawRows;

  const rows = rowsForNormalize.map(normalizeRow);
  console.log('Parsed rows count:', rows.length);
  console.log('First row sample:', rows[0]);

  const matricules = rows.map(r => r.Matricule).filter(Boolean);
  const serials = rows.map(r => r.SerialNumber).filter(Boolean);
  const existing = await prisma.asset.findMany({ where: { OR: [ { Matricule: { in: matricules } }, { SerialNumber: { in: serials } } ] }, select: { Matricule: true, SerialNumber: true } });
  const duplicateRows: number[] = [];
  rows.forEach((r, idx) => {
    if (existing.some(e => e.Matricule === r.Matricule || (!!r.SerialNumber && e.SerialNumber === r.SerialNumber))) {
      duplicateRows.push(idx + 2);
    }
  });

  const validationErrors: Array<{ row: number; field: string; message: string; value: any }> = [];
  rows.forEach((r, idx) => {
    const rowNum = idx + 2; // assuming header at row 1
    if (!r.Matricule) validationErrors.push({ row: rowNum, field: 'Matricule', message: 'Matricule requis', value: r.Matricule });
    const cat = mapCategorie(r.Categorie);
    const val = mapValidation(r.Validation);
    if (!['Micro_ordinateur', 'Laptop', 'Serveur', 'Imprimante', 'Autre'].includes(cat)) {
      validationErrors.push({ row: rowNum, field: 'Categorie', message: `Catégorie invalide`, value: r.Categorie });
    }
    if (!['OK', 'A_verifier', 'Non_conforme'].includes(val)) {
      validationErrors.push({ row: rowNum, field: 'Validation', message: `Validation invalide`, value: r.Validation });
    }
  });

  const suggestedMapping = suggestMapping(headers);
  console.log('Validation completed, errors:', validationErrors.length);
  res.json({ 
    total: rows.length, 
    duplicates: duplicateRows, 
    validationErrors, 
    sampleData: rows.slice(0,10),
    headers,
    suggestedMapping
  });
});

assetsRouter.post('/import/commit', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const { fileBase64, onDuplicate = 'update', mapping } = req.body as { fileBase64: string; onDuplicate?: 'skip' | 'update'; mapping?: Record<string, string> };
  console.log('Import commit request received, fileBase64 length:', fileBase64?.length, 'onDuplicate:', onDuplicate);

  const buf = Buffer.from((fileBase64 || '').split(',').pop() || '', 'base64');
  const rawRows = parseBufferToRows(buf);
  const rowsForNormalize = (mapping && Object.keys(mapping).length)
    ? rawRows.map(r => applyMapping(r, mapping))
    : rawRows;
  const rows = rowsForNormalize.map(normalizeRow);
  console.log('Import processing', rows.length, 'rows');

  const results: Array<{ status: 'ok' | 'error' | 'skipped'; row: number; message?: string; data?: any }> = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // header is row 1
    console.log('Processing row:', rowNum, r.Matricule, r.Categorie, r.Validation);
    if (!r.Matricule) { 
      results.push({ row: rowNum, status: 'skipped', message: 'Matricule requis' }); 
      continue; 
    }
    try {
      const existing = await prisma.asset.findUnique({ where: { Matricule: r.Matricule } });
      const data = { 
        ...r, 
        DateDePassage: (r as any)?.DateDePassage, 
        Categorie: mapCategorie(r.Categorie) as any, 
        Etat: mapEtat(r.Etat) as any, 
        Validation: mapValidation(r.Validation) as any 
      };
      if (existing) {
        if (onDuplicate === 'skip') { 
          results.push({ row: rowNum, status: 'skipped', message: 'Doublon ignoré' }); 
          continue; 
        }
        const updated = await prisma.asset.update({ where: { Matricule: r.Matricule }, data });
        await logAudit('Asset', r.Matricule, 'import-update', req.user!.id, { before: existing, after: updated });
      } else {
        const created = await prisma.asset.create({ data });
        await logAudit('Asset', r.Matricule, 'import-create', req.user!.id, { after: created });
      }
      results.push({ row: rowNum, status: 'ok' });
    } catch (e: any) {
      console.error('Error processing row', r.Matricule, ':', e.message);
      results.push({ row: rowNum, status: 'error', message: e.message });
    }
  }
  console.log('Import completed, results:', results.length);
  res.json({ results });
});

// Template download endpoint
assetsRouter.get('/template.csv', requireAuth, async (_req: Request, res: Response) => {
  const headers = ['Matricule', 'Nom-Prenom', 'Entite', 'Categorie', 'Marque', 'Modele', 'Code', 'Serial Number', 'Validation', 'Remarque', 'Date De Passage'];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="asset_import_template.csv"');
  res.send(buf);
});

assetsRouter.get('/export.csv', requireAuth, async (req: Request, res: Response) => {
  const { q = '', Entite, Categorie, Etat, Validation } = req.query as any;
  const where: any = { deletedAt: null };
  if (q) where.OR = [
    { Matricule: { contains: q as string, mode: 'insensitive' } },
    { SerialNumber: { contains: q as string, mode: 'insensitive' } },
    { NomPrenom: { contains: q as string, mode: 'insensitive' } },
  ];
  if (Entite) where.Entite = String(Entite);
  if (Categorie) where.Categorie = mapCategorie(String(Categorie));
  if (Etat) where.Etat = String(Etat).replace(' ', '_');
  if (Validation) where.Validation = mapValidation(String(Validation));
  const items = await prisma.asset.findMany({ where, orderBy: { updatedAt: 'desc' } });
  const rows = items.map((i: any) => ({
    'Matricule': i.Matricule,
    'Nom-Prenom': i.NomPrenom || '',
    'Entite': i.Entite || '',
    'Categorie': humanCategorie(i.Categorie),
    'Marque': i.Marque || '',
    'Modele': i.Modele || '',
    'Code': i.Code || '',
    'Serial Number': i.SerialNumber || '',
    'Validation': humanValidation(i.Validation),
    'Remarque': i.Remarque || '',
    'Date De Passage': i.DateDePassage ? new Date(i.DateDePassage).toLocaleDateString('fr-FR') : ''
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assets');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
  res.send(buf);
});

function mapCategorie(c?: string): string {
  const s = (c || '').toLowerCase();
  if (s === 'pc' || s === 'desktop') return 'Micro_ordinateur';
  if (s.includes('micro')) return 'Micro_ordinateur';
  if (s.includes('laptop') || s.includes('portable')) return 'Laptop';
  if (s.includes('serveur') || s.includes('server')) return 'Serveur';
  if (s.includes('imprimante') || s.includes('printer')) return 'Imprimante';
  return 'Autre';
}

function mapEtat(e?: string) { return (e?.replace(' ', '_') as any) || 'En_service'; }

function mapValidation(v?: string): string {
  const s = (v || '').toLowerCase();
  if (s === 'ok' || s.includes('conforme')) return 'OK';
  if (s === 'no' || s.includes('non')) return 'Non_conforme';
  if (s.includes('vérifier') || s.includes('verifier')) return 'A_verifier';
  return 'A_verifier';
}

function humanCategorie(c: string): string {
  return c === 'Micro_ordinateur' ? 'Micro-ordinateur' : c;
}

function humanValidation(v: string): string {
  if (v === 'A_verifier') return 'A vérifier';
  if (v === 'Non_conforme') return 'Non conforme';
  return v;
}

function suggestMapping(headers: string[]): Record<string, string> {
  const canonical = {
    Matricule: ['matricule', 'id', 'asset id', 'asset'],
    'NomPrenom': ['nom-prenom', 'nom prenom', 'user', 'utilisateur', 'employe', 'employé', 'name'],
    Entite: ['entite', 'entité', 'service', 'departement', 'département', 'department'],
    Categorie: ['categorie', 'catégorie', 'category', 'type'],
    Marque: ['marque', 'brand'],
    Modele: ['modele', 'modèle', 'model'],
    Code: ['code', 'code inventaire', 'inventory code'],
    'Serial Number': ['serial number', 'serial', 'sn', 'n° serie', 'n° série', 'ns', 'ns(serial number)'],
    Etat: ['etat', 'état', 'status', 'state'],
    Validation: ['validation', 'val'],
    Remarque: ['remarque', 'observation', 'commentaire', 'comment'],
    'Date De Passage': ['date de passage', 'date', 'passage']
  } as Record<string, string[]>;
  const map: Record<string, string> = {};
  headers.forEach(h => {
    const key = h.toLowerCase().trim();
    let matched: string | undefined;
    for (const [target, alts] of Object.entries(canonical)) {
      if (target.toLowerCase() === key || alts.includes(key)) {
        matched = target;
        break;
      }
    }
    map[h] = matched || 'IGNORE';
  });
  return map;
}

function applyMapping(row: any, mapping: Record<string, string>) {
  const out = { ...row };
  for (const [source, target] of Object.entries(mapping)) {
    if (!target || target === 'IGNORE') continue;
    if (Object.prototype.hasOwnProperty.call(row, source)) {
      out[target] = row[source];
    }
  }
  return out;
}

// Export endpoint - Excel only
assetsRouter.get('/export/excel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { Entite, Categorie, Etat, Validation } = req.query as any;
    const where: any = { deletedAt: null };
    
    if (Entite) where.Entite = String(Entite);
    if (Categorie) where.Categorie = String(Categorie);
    if (Etat) where.Etat = String(Etat).replace(' ', '_');
    if (Validation) where.Validation = String(Validation).replace(' ', '_');
    
    const assets = await prisma.asset.findMany({ 
      where, 
      orderBy: { updatedAt: 'desc' } 
    });
    
    const columns = [
      { header: 'Matricule', key: 'Matricule', width: 15 },
      { header: 'Nom/Prénom', key: 'NomPrenom', width: 25 },
      { header: 'Entité', key: 'Entite', width: 20 },
      { header: 'Catégorie', key: 'Categorie', width: 20 },
      { header: 'Marque', key: 'Marque', width: 15 },
      { header: 'Modèle', key: 'Modele', width: 20 },
      { header: 'Code', key: 'Code', width: 15 },
      { header: 'Numéro de Série', key: 'SerialNumber', width: 20 },
      { header: 'État', key: 'Etat', width: 15 },
      { header: 'Validation', key: 'Validation', width: 15 },
      { header: 'Remarque', key: 'Remarque', width: 30 },
      { header: 'Date de Passage', key: 'DateDePassage', width: 15 },
    ];
    
    const timestamp = new Date().toISOString().split('T')[0];
    await exportToExcel(assets, columns, `actifs_${timestamp}.xlsx`, res);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});
