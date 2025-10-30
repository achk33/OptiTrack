import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser { id: string; role: 'Admin' | 'Technicien' | 'Lecteur'; email: string; name: string }

declare global {
  namespace Express {
    interface Request { user?: AuthUser }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Try to get token from Authorization header first, then from query parameter
  let token: string | undefined;
  const header = req.headers.authorization;
  
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || '');
    req.user = payload as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: 'Jeton invalide' });
  }
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Non autorisé' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Accès refusé' });
    next();
  };
}
