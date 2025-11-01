import express, { Request, Response } from 'express'
import { prisma } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = express.Router()

// GET all activity logs (admin only)
router.get('/', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit to last 500 logs
    })

    // Transform the data to match frontend expectations
    const transformedLogs = logs.map(log => {
      let detailsText = ''
      
      if (log.details) {
        if (typeof log.details === 'object' && log.details !== null) {
          // Handle JSON details
          const detailsObj = log.details as any
          detailsText = detailsObj.message || JSON.stringify(log.details)
        } else {
          detailsText = String(log.details)
        }
      }

      return {
        id: log.id,
        userId: log.userId,
        action: log.action,
        details: detailsText,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
        module: log.module,
        user: {
          firstName: log.User.firstName,
          lastName: log.User.lastName,
          email: log.User.email,
          role: log.User.role,
        },
      }
    })

    res.json(transformedLogs)
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
