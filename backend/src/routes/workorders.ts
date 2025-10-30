import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { exportToExcel } from '../utils/export';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const workOrdersRouter = Router();
const upload = multer({ dest: path.join(process.cwd(), 'uploads') });

workOrdersRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { assigne, statut, assetMatricule, page = '1', pageSize = '20' } = req.query as any;
  const take = Math.min(100, Number(pageSize));
  const skip = (Number(page) - 1) * take;
  const where: any = {};
  if (assigne) where.assigne = String(assigne);
  if (statut) where.statut = String(statut);
  if (assetMatricule) where.assetMatricule = String(assetMatricule);
  const [items, total] = await Promise.all([
    prisma.workOrder.findMany({ where, include: { asset: true }, skip, take, orderBy: { echeance: 'asc' } }),
    prisma.workOrder.count({ where })
  ]);
  res.json({ items, total, page: Number(page), pageSize: take });
});

workOrdersRouter.post('/', requireAuth, requireRole('Admin', 'Technicien'), async (req: Request, res: Response) => {
  const wo = await prisma.workOrder.create({ data: req.body });
  res.status(201).json(wo);
});

workOrdersRouter.patch('/:id', requireAuth, requireRole('Admin', 'Technicien'), async (req: Request, res: Response) => {
  const wo = await prisma.workOrder.update({ where: { id: req.params.id }, data: req.body });
  res.json(wo);
});

workOrdersRouter.post('/:id/complete', requireAuth, requireRole('Admin', 'Technicien'), async (req: Request, res: Response) => {
  const { commentaires, tempsPasse, attachments, taches, resultEtat, resultValidation } = req.body as any;
  const updated = await prisma.workOrder.update({ where: { id: req.params.id }, data: { statut: 'Terminé', commentaires, tempsPasse, attachments, taches } });
  if (resultEtat || resultValidation) {
    await prisma.asset.update({ where: { Matricule: updated.assetMatricule }, data: { Etat: resultEtat, Validation: resultValidation } as any });
  }
  res.json(updated);
});

workOrdersRouter.post('/:id/attachments', requireAuth, requireRole('Admin', 'Technicien'), upload.array('files', 5), async (req: Request, res: Response) => {
  const id = req.params.id;
  const files = (req.files as Express.Multer.File[])?.map(f => ({ filename: f.originalname, path: f.filename }));
  const wo = await prisma.workOrder.update({ where: { id }, data: { attachments: files as any } });
  res.json(wo);
});

workOrdersRouter.get('/calendar/events', requireAuth, async (_req: Request, res: Response) => {
  const items = await prisma.workOrder.findMany({ select: { id: true, echeance: true, statut: true, assetMatricule: true } });
  const events = items.map(i => ({ id: i.id, title: `${i.assetMatricule} - ${i.statut}`, date: i.echeance }));
  res.json(events);
});

// Export endpoint - Excel only
workOrdersRouter.get('/export/excel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { statut, assigne } = req.query as any;
    const where: any = {};
    if (statut) where.statut = String(statut);
    if (assigne) where.assigne = String(assigne);
    
    const workOrders = await prisma.workOrder.findMany({ 
      where, 
      include: { asset: true },
      orderBy: { echeance: 'asc' } 
    });
    
    const data = workOrders.map(wo => ({
      ID: wo.id,
      Matricule: wo.assetMatricule,
      Priorite: wo.priorite,
      Statut: wo.statut,
      Assigne: wo.assigne || 'Non assigné',
      Echeance: wo.echeance,
      TempsPasse: wo.tempsPasse,
      CreeLe: wo.createdAt,
    }));
    
    const columns = [
      { header: 'ID', key: 'ID', width: 30 },
      { header: 'Matricule', key: 'Matricule', width: 15 },
      { header: 'Priorité', key: 'Priorite', width: 12 },
      { header: 'Statut', key: 'Statut', width: 15 },
      { header: 'Assigné', key: 'Assigne', width: 20 },
      { header: 'Échéance', key: 'Echeance', width: 15 },
      { header: 'Temps Passé (min)', key: 'TempsPasse', width: 15 },
      { header: 'Créé Le', key: 'CreeLe', width: 20 },
    ];
    
    const timestamp = new Date().toISOString().split('T')[0];
    await exportToExcel(data, columns, `ordres_travail_${timestamp}.xlsx`, res);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});
