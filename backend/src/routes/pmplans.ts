import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

export const pmPlansRouter = Router();

pmPlansRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { page = '1', pageSize = '50', active, periodicite } = req.query as any;
  const take = Math.min(100, Number(pageSize));
  const skip = (Number(page) - 1) * take;
  
  const where: any = {};
  if (active !== undefined) where.active = active === 'true';
  if (periodicite) where.periodicite = String(periodicite);
  
  const [plans, total] = await Promise.all([
    prisma.pMPlan.findMany({ 
      where, 
      skip, 
      take, 
      orderBy: { updatedAt: 'desc' } 
    }),
    prisma.pMPlan.count({ where })
  ]);
  
  res.json({ items: plans, total, page: Number(page), pageSize: take });
});

pmPlansRouter.post('/', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const plan = await prisma.pMPlan.create({ data: req.body });
  res.status(201).json(plan);
});

pmPlansRouter.patch('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  const plan = await prisma.pMPlan.update({ where: { id: req.params.id }, data: req.body });
  res.json(plan);
});

pmPlansRouter.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  await prisma.pMPlan.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
