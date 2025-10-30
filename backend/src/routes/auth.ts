import { Router, Request, Response } from 'express';
import { prisma } from '../db/client';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole } from '../middleware/auth';
import { validatePasswordStrength, hashPassword, comparePassword } from '../utils/password';
import { validate, validationRules } from '../utils/validation';
import { logger } from '../utils/logger';

export const authRouter = Router();

// Login endpoint with rate limiting applied in server.ts
authRouter.post('/login', 
  validate([
    validationRules.email(),
    validationRules.string('password', 1, 255),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      
      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      
      // Don't reveal if user exists or not (security best practice)
      if (!user) {
        logger.warn(`Failed login attempt for non-existent user: ${email}`, { ip: req.ip });
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      
      // Check if account is locked
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
        logger.warn(`Login attempt for locked account: ${email}`, { ip: req.ip });
        return res.status(403).json({ 
          error: `Compte verrouillé. Réessayez dans ${remainingMinutes} minute(s).`
        });
      }
      
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        // Increment failed login attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const shouldLockout = failedAttempts >= 5;
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lockoutUntil: shouldLockout ? new Date(Date.now() + 15 * 60 * 1000) : null, // 15 minutes lockout
          },
        });
        
        logger.warn(`Failed login attempt ${failedAttempts}/5 for: ${email}`, { ip: req.ip });
        
        if (shouldLockout) {
          return res.status(403).json({ 
            error: 'Trop de tentatives échouées. Compte verrouillé pour 15 minutes.' 
          });
        }
        
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      
      // Reset failed attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastLogin: new Date(),
        },
      });
      
      const name = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.lastName || user.email;
      
      // Map database roles to frontend expected format
      const roleMap: Record<string, string> = {
        'ADMIN': 'Admin',
        'TECHNICIEN': 'Technicien', 
        'VIEWER': 'Lecteur',
        'Admin': 'Admin',
        'Technicien': 'Technicien',
        'Lecteur': 'Lecteur'
      };
      const mappedRole = roleMap[user.role] || user.role;
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: mappedRole, email: user.email, name }, 
        process.env.JWT_SECRET || '',
        { expiresIn: '24h' }
      );
      
      // Log successful login
      try {
        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            module: 'AUTH',
            details: { message: `Connexion réussie` },
            ipAddress: req.ip,
            status: 'SUCCESS',
          },
        });
      } catch (error) {
        logger.error('Failed to log login activity:', error);
      }
      
      logger.info(`Successful login for user: ${email}`);
      res.json({ token, user: { id: user.id, role: mappedRole, email: user.email, name } });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  }
);

// Register endpoint (admin only)
authRouter.post('/register', 
  requireAuth, 
  requireRole('Admin'), 
  validate([
    validationRules.name('firstName'),
    validationRules.name('lastName'),
    validationRules.email(),
    validationRules.password(),
    validationRules.role(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, password, role } = req.body as any;
      
      // Check if user already exists
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return res.status(400).json({ error: 'Email déjà utilisé' });
      }
      
      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          error: 'Mot de passe trop faible', 
          details: passwordValidation.errors 
        });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const user = await prisma.user.create({ 
        data: { 
          firstName, 
          lastName, 
          email, 
          password: hashedPassword, 
          role,
          failedLoginAttempts: 0,
        } 
      });
      
      // Log user creation
      try {
        await prisma.activityLog.create({
          data: {
            userId: req.user!.id,
            action: 'CREATE_USER',
            module: 'USER',
            details: { message: `Utilisateur créé: ${email}`, targetUserId: user.id },
            ipAddress: req.ip,
            status: 'SUCCESS',
          },
        });
      } catch (error) {
        logger.error('Failed to log user creation:', error);
      }
      
      logger.info(`User created: ${email} by ${req.user!.email}`);
      res.status(201).json({ id: user.id, message: 'Utilisateur créé avec succès' });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
  }
);

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.lastName || user.email;
  
  // Map database roles to frontend expected format
  const roleMap: Record<string, string> = {
    'ADMIN': 'Admin',
    'TECHNICIEN': 'Technicien', 
    'VIEWER': 'Lecteur'
  };
  const mappedRole = roleMap[user.role] || user.role;
  
  res.json({ user: { id: user.id, role: mappedRole, email: user.email, name } });
});

// Check session endpoint - validates if the current token is still valid
authRouter.get('/check-session', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Token manquant' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
    
    // Check if user still exists in database
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id } 
    });
    
    if (!user) {
      return res.status(401).json({ valid: false, error: 'Utilisateur introuvable' });
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token }
    });
    
    if (isBlacklisted) {
      return res.status(401).json({ valid: false, error: 'Token révoqué' });
    }
    
    // Session is valid
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    res.json({ valid: true, user: { id: user.id, role: user.role, email: user.email, name } });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Token invalide ou expiré' });
  }
});

// Enhanced logout endpoint - blacklists the token
authRouter.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({ message: 'Déconnexion réussie' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Decode token to get expiration time and user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Add token to blacklist
    await prisma.tokenBlacklist.create({
      data: {
        token,
        expiresAt
      }
    });
    
    // Log logout activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: decoded.id,
          action: 'LOGOUT',
          module: 'AUTH',
          details: { message: 'Déconnexion' },
          ipAddress: req.ip,
          status: 'SUCCESS',
        },
      });
    } catch (error) {
      console.error('Failed to log logout activity:', error);
    }
    
    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    // If token is already invalid or blacklisted, still return success
    // Check if it's a unique constraint violation (token already blacklisted)
    const isAlreadyBlacklisted = (error as any)?.code === 'P2002';
    
    if (isAlreadyBlacklisted) {
      return res.status(200).json({ message: 'Déconnexion réussie' });
    }
    
    // Token might be expired or invalid, but logout should still succeed
    res.status(200).json({ message: 'Déconnexion réussie' });
  }
});
