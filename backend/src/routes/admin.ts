import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Cleanup audit logs endpoint (Admin only)
router.delete('/audit-logs', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    // Optional: Delete logs older than specific date
    const { olderThan } = req.query;
    
    let whereCondition: any = undefined;
    
    if (olderThan) {
      // Delete logs older than specified date
      const cutoffDate = new Date(olderThan as string);
      whereCondition = {
        changedAt: {
          lt: cutoffDate
        }
      };
    }
    
    // Count before deletion
    const countBefore = await prisma.auditLog.count(
      whereCondition ? { where: whereCondition } : undefined
    );
    
    // Delete audit logs
    const result = await prisma.auditLog.deleteMany(
      whereCondition ? { where: whereCondition } : undefined
    );
    
    res.json({
      message: 'Audit logs supprimés avec succès',
      deletedCount: result.count,
      countBefore
    });
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

// Get audit logs statistics
router.get('/audit-logs/stats', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const total = await prisma.auditLog.count();
    
    const last30Days = await prisma.auditLog.count({
      where: {
        changedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    const last7Days = await prisma.auditLog.count({
      where: {
        changedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    const oldest = await prisma.auditLog.findFirst({
      orderBy: { changedAt: 'asc' },
      select: { changedAt: true }
    });
    
    const newest = await prisma.auditLog.findFirst({
      orderBy: { changedAt: 'desc' },
      select: { changedAt: true }
    });
    
    res.json({
      total,
      last30Days,
      last7Days,
      oldestEntry: oldest?.changedAt,
      newestEntry: newest?.changedAt
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
