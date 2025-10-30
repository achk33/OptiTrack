import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { emailService } from '../services/email.service'
import { passwordResetLimiter } from '../middleware/rateLimiter'

const passwordResetRouter = Router()

// Request password reset
passwordResetRouter.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email requis' })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success (security best practice - don't reveal if email exists)
    if (!user) {
      return res.json({ 
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Store token in database (expires in 1 hour)
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        ipAddress: req.ip || req.socket.remoteAddress || null,
      },
    })

    // Send reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken, // Send unhashed token in email
      `${user.firstName} ${user.lastName}`
    )

    if (!emailSent) {
      console.warn('Failed to send password reset email to:', user.email)
    }

    res.json({ 
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' })
  }
})

// Verify reset token
passwordResetRouter.get('/verify-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    if (!token) {
      return res.status(400).json({ error: 'Token requis' })
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Find valid reset request
    const resetRequest = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!resetRequest) {
      return res.status(400).json({ 
        error: 'Token invalide ou expiré',
        expired: true,
      })
    }

    res.json({
      valid: true,
      email: resetRequest.user.email,
      name: `${resetRequest.user.firstName} ${resetRequest.user.lastName}`,
    })
  } catch (error) {
    console.error('Token verification error:', error)
    res.status(500).json({ error: 'Erreur lors de la vérification du token' })
  }
})

// Reset password with token
passwordResetRouter.post('/reset-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'Le mot de passe doit contenir au moins 8 caractères',
      })
    }

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Find valid reset request
    const resetRequest = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!resetRequest) {
      return res.status(400).json({ 
        error: 'Token invalide ou expiré',
        expired: true,
      })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: resetRequest.id },
        data: { used: true },
      }),
      // Invalidate all user sessions for security
      prisma.userSession.updateMany({
        where: { userId: resetRequest.userId },
        data: { isActive: false },
      }),
    ])

    res.json({ 
      message: 'Mot de passe réinitialisé avec succès',
      success: true,
    })
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' })
  }
})

// Clean up expired tokens (can be called by a cron job)
passwordResetRouter.delete('/cleanup-expired', async (req: Request, res: Response) => {
  try {
    const result = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { used: true },
        ],
      },
    })

    res.json({ 
      message: `${result.count} expired tokens cleaned up`,
      count: result.count,
    })
  } catch (error) {
    console.error('Token cleanup error:', error)
    res.status(500).json({ error: 'Erreur lors du nettoyage des tokens' })
  }
})

export { passwordResetRouter }
