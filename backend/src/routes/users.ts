import express, { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = express.Router()

// Log activity helper
const logActivity = async (data: { userId: string; action: string; details: string; ipAddress?: string }) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: 'USERS',
        details: { message: data.details },
        ipAddress: data.ipAddress,
        status: 'SUCCESS',
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

// UPDATE own profile (all authenticated users)
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' })
    }

    const { firstName, lastName, email } = req.body

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: 'Tous les champs sont requis' })
    }

    // Check if email is already used by another user
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName, email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    })

    await logActivity({
      userId,
      action: 'UPDATE',
      details: `Mise à jour du profil`,
      ipAddress: req.ip,
    })

    res.json(updatedUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// CHANGE own password (all authenticated users)
router.put('/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ message: 'Non autorisé' })
    }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Tous les champs sont requis' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
    }

    // Get current user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    await logActivity({
      userId,
      action: 'UPDATE',
      details: `Changement de mot de passe`,
      ipAddress: req.ip,
    })

    res.json({ message: 'Mot de passe mis à jour avec succès' })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// GET all users (admin only)
router.get('/', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// POST create new user (admin only)
router.post('/', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, password, role } = req.body

    // Validation
    if (!email || !firstName || !lastName || !password || !role) {
      return res.status(400).json({ message: 'Tous les champs sont requis' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' })
    }

    if (!['ADMIN', 'TECHNICIEN', 'VIEWER'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    // Log activity
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        action: 'CREATE',
        details: `Création de l'utilisateur ${newUser.email} (${role})`,
        ipAddress: req.ip,
      })
    }

    res.status(201).json(newUser)
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// PATCH update user status (admin only)
router.patch('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive doit être un booléen' })
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user?.id && !isActive) {
      return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    })

    // Log activity
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        action: 'UPDATE',
        details: `Modification du statut de ${user.email} → ${isActive ? 'Actif' : 'Inactif'}`,
        ipAddress: req.ip,
      })
    }

    res.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// DELETE user (admin only)
router.delete('/:id', requireAuth, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.id

    // Prevent admin from deleting themselves
    if (userId === req.user?.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    })

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' })
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    // Log activity
    if (req.user) {
      await logActivity({
        userId: req.user.id,
        action: 'DELETE',
        details: `Suppression de l'utilisateur ${user.email}`,
        ipAddress: req.ip,
      })
    }

    res.json({ message: 'Utilisateur supprimé' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
