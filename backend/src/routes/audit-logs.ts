import express, { Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET audit logs filtered by entity
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, page = '1', pageSize = '50' } = req.query as any;
    const take = Math.min(100, Number(pageSize));
    const skip = (Number(page) - 1) * take;
    
    const where: any = {};
    if (entityId) where.entityId = String(entityId);
    if (entityType) where.entity = String(entityType);
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({ items: logs, total, page: Number(page), pageSize: take });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
