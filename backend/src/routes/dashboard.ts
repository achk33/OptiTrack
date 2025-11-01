import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { cacheMiddleware, CacheTTL, cache } from '../utils/cache';

export const dashboardRouter = Router();

// Helper function to get period in months
function getPeriodInMonths(periodicite: string): number {
  switch (periodicite) {
    case 'MIS': return 1;
    case 'TRI': return 3;
    case 'SEMESTRE': return 6;
    case 'ANNUEL': return 12;
    default: return 1;
  }
}

// Dashboard stats endpoint - cached for 5 minutes
dashboardRouter.get('/stats', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (req: Request, res: Response) => {
  try {
    const totalAssets = await prisma.asset.count({ where: { deletedAt: null } })
    
    const assetsInMaintenance = await prisma.workOrder.count({
      where: { 
        statut: { in: ['En cours', 'En attente'] }
      }
    })
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentActivities = await prisma.activityLog.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    
    let totalUsers = 0
    if (req.user && req.user.role === 'Admin') {
      totalUsers = await prisma.user.count()
    }
    
    res.json({
      totalAssets,
      totalUsers,
      recentActivities,
      assetsInMaintenance,
    })
  } catch (error) {
    console.error('Fetch dashboard stats error:', error)
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

dashboardRouter.get('/kpis', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (_req: Request, res: Response) => {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  const start60 = new Date(now);
  start60.setDate(start60.getDate() - 60);

  try {
    // Optimize: Use groupBy to get all asset counts in 2 queries instead of 8
    const [assetsByValidation, assetsByCategory, workOrderStats] = await Promise.all([
      // Single query to get counts by validation status (replaces 4 count queries)
      prisma.asset.groupBy({
        by: ['Validation'],
        where: { deletedAt: null },
        _count: { _all: true }
      }),
      // Single query to get counts by category (replaces 4 count queries)
      prisma.asset.groupBy({
        by: ['Categorie'],
        where: { deletedAt: null },
        _count: { _all: true }
      }),
      // Fetch all work orders once and process in memory (efficient for moderate datasets)
      prisma.workOrder.findMany({
        select: {
          statut: true,
          echeance: true,
          createdAt: true
        }
      })
    ]);

    // Process asset validation data
    const validationMap = assetsByValidation.reduce((acc, item) => {
      acc[item.Validation] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const actifsOK = validationMap['OK'] || 0;
    const actifsAVerifier = validationMap['A_verifier'] || 0;
    const actifsNonConformes = validationMap['Non_conforme'] || 0;
    const actifsTotal = actifsOK + actifsAVerifier + actifsNonConformes;

    // Process asset category data
    const categoryMap = assetsByCategory.reduce((acc, item) => {
      acc[item.Categorie] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    // Process work order data in memory (single query instead of 4)
    let woOuverts = 0;
    let woEnRetard = 0;
    let woCreated30 = 0;
    let woCreatedPrev30 = 0;

    workOrderStats.forEach(wo => {
      // Count open work orders
      if (['Ouvert', 'En cours', 'En attente'].includes(wo.statut)) {
        woOuverts++;
        // Count overdue work orders
        if (['Ouvert', 'En cours'].includes(wo.statut) && wo.echeance && wo.echeance < now) {
          woEnRetard++;
        }
      }
      
      // Count work orders created in last 30 days
      if (wo.createdAt >= start30) {
        woCreated30++;
      }
      
      // Count work orders created in previous 30 days (30-60 days ago)
      if (wo.createdAt >= start60 && wo.createdAt < start30) {
        woCreatedPrev30++;
      }
    });
  
    res.json({ 
      woOuverts, 
      woEnRetard, 
      actifsTotal, 
      actifsOK, 
      actifsAVerifier, 
      actifsNonConformes,
      woCreated30,
      woCreatedPrev30,
      // Asset counts by category
      assetsByCategory: {
        Laptop: categoryMap['Laptop'] || 0,
        Imprimante: categoryMap['Imprimante'] || 0,
        Serveur: categoryMap['Serveur'] || 0,
        Micro_ordinateur: categoryMap['Micro_ordinateur'] || 0
      }
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ message: 'Failed to fetch KPIs' });
  }
});

dashboardRouter.get('/entite', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (_req: Request, res: Response) => {
  const byEntite = await prisma.asset.groupBy({ 
    by: ['Entite'], 
    _count: { _all: true },
    where: { deletedAt: null }
  });
  res.json(byEntite);
});

dashboardRouter.get('/categorie', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (_req: Request, res: Response) => {
  const byCategorie = await prisma.asset.groupBy({ 
    by: ['Categorie'], 
    _count: { _all: true },
    where: { deletedAt: null }
  });
  res.json(byCategorie);
});

dashboardRouter.get('/validation', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (_req: Request, res: Response) => {
  const byValidation = await prisma.asset.groupBy({ 
    by: ['Validation'], 
    _count: { _all: true },
    where: { deletedAt: null }
  });
  res.json(byValidation);
});

dashboardRouter.get('/etat', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (_req: Request, res: Response) => {
  const byEtat = await prisma.asset.groupBy({ 
    by: ['Etat'], 
    _count: { _all: true },
    where: { deletedAt: null }
  });
  res.json(byEtat);
});

dashboardRouter.get('/marque', requireAuth, cacheMiddleware(CacheTTL.LONG), async (_req: Request, res: Response) => {
  const byMarque = await prisma.asset.groupBy({ 
    by: ['Marque'], 
    _count: { _all: true },
    where: { deletedAt: null },
    orderBy: { _count: { Marque: 'desc' } },
    take: 10
  });
  res.json(byMarque);
});

dashboardRouter.get('/activity', requireAuth, cacheMiddleware(CacheTTL.SHORT), async (_req: Request, res: Response) => {
  try {
    // Get asset creation activity over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Optimized: Only select createdAt field to minimize data transfer
    const activity = await prisma.asset.findMany({
      where: { 
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const activityByDate = activity.reduce((acc, asset) => {
      const date = asset.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fill in missing dates with 0
    const dates = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push({
        date: dateStr,
        count: activityByDate[dateStr] || 0
      });
    }

    res.json(dates);
  } catch (error) {
    console.error('Error fetching activity data:', error);
    res.status(500).json({ message: 'Failed to fetch activity data' });
  }
});

dashboardRouter.get('/work-orders/monthly', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (_req: Request, res: Response) => {
  try {
    // Get work order statistics for the last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Optimized: Select only required fields to minimize data transfer
    const workOrders = await prisma.workOrder.findMany({
      where: { 
        createdAt: { gte: oneYearAgo }
      },
      select: { 
        createdAt: true,
        statut: true,
        echeance: true
      }
    });

    // Group by month
    const monthlyData = workOrders.reduce((acc, wo) => {
      const month = wo.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { created: 0, completed: 0, overdue: 0 };
      }
      acc[month].created++;
      if (wo.statut === 'Terminé') acc[month].completed++;
      if (wo.echeance && wo.echeance < new Date() && wo.statut !== 'Terminé') {
        acc[month].overdue++;
      }
      return acc;
    }, {} as Record<string, { created: number; completed: number; overdue: number }>);

    // Convert to array and fill missing months
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      months.push({
        month: monthStr,
        ...monthlyData[monthStr] || { created: 0, completed: 0, overdue: 0 }
      });
    }

    res.json(months);
  } catch (error) {
    console.error('Error fetching monthly work order data:', error);
    res.status(500).json({ message: 'Failed to fetch monthly work order data' });
  }
});

dashboardRouter.get('/health-score', requireAuth, cacheMiddleware(CacheTTL.MEDIUM), async (_req: Request, res: Response) => {
  try {
    // Optimize: Use single groupBy query instead of 4 separate count queries
    const validationStats = await prisma.asset.groupBy({
      by: ['Validation'],
      where: { deletedAt: null },
      _count: { _all: true }
    });

    const breakdown = validationStats.reduce((acc, item) => {
      const count = item._count._all;
      if (item.Validation === 'OK') acc.ok = count;
      else if (item.Validation === 'A_verifier') acc.aVerifier = count;
      else if (item.Validation === 'Non_conforme') acc.nonConforme = count;
      return acc;
    }, { ok: 0, aVerifier: 0, nonConforme: 0 });

    const total = breakdown.ok + breakdown.aVerifier + breakdown.nonConforme;
    const healthScore = total > 0 ? Math.round((breakdown.ok / total) * 100) : 0;
    
    res.json({
      healthScore,
      total,
      breakdown
    });
  } catch (error) {
    console.error('Error fetching health score:', error);
    res.status(500).json({ message: 'Failed to fetch health score' });
  }
});

dashboardRouter.get('/data-quality', requireAuth, requireRole('Admin'), async (_req: Request, res: Response) => {
  try {
    // Find duplicate Matricules
    const duplicateMatricules = await prisma.asset.groupBy({
      by: ['Matricule'],
      having: {
        Matricule: {
          _count: {
            gt: 1
          }
        }
      },
      where: { deletedAt: null },
      _count: { Matricule: true }
    });

    // Find duplicate Serial Numbers
    const duplicateSerials = await prisma.asset.groupBy({
      by: ['SerialNumber'],
      having: {
        SerialNumber: {
          _count: {
            gt: 1
          }
        }
      },
      where: { 
        deletedAt: null,
        SerialNumber: { not: '' }
      },
      _count: { SerialNumber: true }
    });

    // Find assets with missing required fields
    const missingData = await prisma.asset.findMany({
      where: {
        deletedAt: null,
        OR: [
          { Matricule: { equals: '' } },
          { SerialNumber: { equals: '' } }
        ]
      },
      select: {
        Matricule: true,
        NomPrenom: true,
        Categorie: true,
        Validation: true,
        SerialNumber: true
      }
    });

    // Get specific duplicate assets
    const duplicateAssets = [];
    for (const dup of duplicateMatricules) {
      const assets = await prisma.asset.findMany({
        where: { 
          Matricule: dup.Matricule,
          deletedAt: null 
        },
        select: {
          Matricule: true,
          NomPrenom: true,
          Entite: true,
          createdAt: true,
          updatedAt: true
        }
      });
      duplicateAssets.push({
        matricule: dup.Matricule,
        count: dup._count.Matricule,
        assets
      });
    }

    const duplicateSerialAssets = [];
    for (const dup of duplicateSerials) {
      const assets = await prisma.asset.findMany({
        where: { 
          SerialNumber: dup.SerialNumber,
          deletedAt: null 
        },
        select: {
          Matricule: true,
          NomPrenom: true,
          SerialNumber: true,
          createdAt: true,
          updatedAt: true
        }
      });
      duplicateSerialAssets.push({
        serialNumber: dup.SerialNumber,
        count: dup._count.SerialNumber,
        assets
      });
    }

    res.json({
      duplicates: {
        matricules: duplicateAssets,
        serialNumbers: duplicateSerialAssets
      },
      missingData,
      summary: {
        totalAssets: await prisma.asset.count({ where: { deletedAt: null } }),
        duplicateMatricules: duplicateMatricules.length,
        duplicateSerials: duplicateSerials.length,
        missingDataCount: missingData.length
      }
    });
  } catch (error) {
    console.error('Error fetching data quality metrics:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des métriques de qualité' });
  }
});

// New endpoint: PM Plan statistics with periodicity breakdown
dashboardRouter.get('/pm-stats', requireAuth, cacheMiddleware(CacheTTL.SHORT), async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.pMPlan.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { workOrders: true }
        }
      }
    });

    // Group by periodicity
    const byPeriod = {
      MIS: { count: 0, plans: [] as any[], totalWorkOrders: 0, months: 1 },
      TRI: { count: 0, plans: [] as any[], totalWorkOrders: 0, months: 3 },
      SEMESTRE: { count: 0, plans: [] as any[], totalWorkOrders: 0, months: 6 },
      ANNUEL: { count: 0, plans: [] as any[], totalWorkOrders: 0, months: 12 }
    };

    plans.forEach(plan => {
      const period = plan.periodicite as keyof typeof byPeriod;
      if (byPeriod[period]) {
        byPeriod[period].count++;
        byPeriod[period].plans.push({
          id: plan.id,
          name: plan.name,
          nextRunAt: plan.nextRunAt
        });
        byPeriod[period].totalWorkOrders += plan._count.workOrders;
      }
    });

    // Calculate upcoming maintenance (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingMaintenance = plans.filter(p => 
      p.nextRunAt && p.nextRunAt <= thirtyDaysFromNow && p.nextRunAt >= new Date()
    );

    res.json({
      totalActivePlans: plans.length,
      byPeriodicity: byPeriod,
      upcomingMaintenance: upcomingMaintenance.map(p => ({
        id: p.id,
        name: p.name,
        periodicite: p.periodicite,
        nextRunAt: p.nextRunAt,
        daysUntil: p.nextRunAt ? Math.ceil((p.nextRunAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching PM stats:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques PM' });
  }
});

// Asset Modification Journal - Admin only
dashboardRouter.get('/audit-logs/assets', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      pageSize = '50',
      assetId,
      action,
      userId,
      startDate,
      endDate 
    } = req.query as any;

    const take = Math.min(100, Number(pageSize));
    const skip = (Number(page) - 1) * take;

    // Build filter conditions
    const where: any = {
      entity: 'Asset',
    };

    if (assetId) where.entityId = assetId;
    if (action) where.action = action;
    if (userId) where.changedBy = userId;
    
    if (startDate || endDate) {
      where.changedAt = {};
      if (startDate) where.changedAt.gte = new Date(startDate as string);
      if (endDate) where.changedAt.lte = new Date(endDate as string);
    }

    // Fetch audit logs with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        take,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Enhance logs with asset information
    const enhancedLogs = await Promise.all(
      logs.map(async (log) => {
        const asset = await prisma.asset.findUnique({
          where: { Matricule: log.entityId },
          select: {
            Matricule: true,
            NomPrenom: true,
            Entite: true,
            Categorie: true,
          },
        });

        return {
          ...log,
          asset: asset || {
            Matricule: log.entityId,
            NomPrenom: 'Actif supprimé',
            Entite: '-',
            Categorie: '-',
          },
        };
      })
    );

    res.json({
      logs: enhancedLogs,
      total,
      page: Number(page),
      pageSize: take,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du journal des modifications' });
  }
});

// Get audit logs for a specific asset
dashboardRouter.get('/audit-logs/assets/:matricule', requireAuth, async (req: Request, res: Response) => {
  try {
    const { matricule } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: {
        entity: 'Asset',
        entityId: matricule,
      },
      orderBy: { changedAt: 'desc' },
      take: 100,
    });

    // Get asset info
    const asset = await prisma.asset.findUnique({
      where: { Matricule: matricule },
      select: {
        Matricule: true,
        NomPrenom: true,
        Entite: true,
        Categorie: true,
      },
    });

    res.json({
      asset: asset || { Matricule: matricule, NomPrenom: 'Actif non trouvé' },
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error('Error fetching asset audit logs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique de l\'actif' });
  }
});

// Get audit statistics
dashboardRouter.get('/audit-logs/stats', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get stats for last 30 days
    const [totalChanges, changesByAction, changesByUser, recentChanges] = await Promise.all([
      // Total changes
      prisma.auditLog.count({
        where: {
          entity: 'Asset',
          changedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Changes by action type
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          entity: 'Asset',
          changedAt: { gte: thirtyDaysAgo },
        },
        _count: true,
      }),

      // Changes by user
      prisma.auditLog.groupBy({
        by: ['changedBy', 'userName', 'userRole'],
        where: {
          entity: 'Asset',
          changedAt: { gte: thirtyDaysAgo },
        },
        _count: true,
        orderBy: {
          _count: {
            changedBy: 'desc',
          },
        },
        take: 10,
      }),

      // Recent changes
      prisma.auditLog.findMany({
        where: {
          entity: 'Asset',
          changedAt: { gte: thirtyDaysAgo },
        },
        orderBy: { changedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          entityId: true,
          action: true,
          userName: true,
          userRole: true,
          changedAt: true,
          changes: true,
        },
      }),
    ]);

    res.json({
      totalChanges,
      changesByAction: changesByAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      changesByUser: changesByUser.map((item) => ({
        userId: item.changedBy,
        userName: item.userName,
        userRole: item.userRole,
        count: item._count,
      })),
      recentChanges,
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques d\'audit' });
  }
});