import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/sessions';

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      deviceId?: string;
      tokenJti?: string;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user info to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Server configuration error' } });
      return;
    }

    try {
      const payload = verifyAccessToken(token, jwtSecret);
      req.userId = payload.userId;
      req.deviceId = payload.deviceId;
      req.tokenJti = payload.jti;
      next();
    } catch (error) {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Authentication error' } });
    return;
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't fail if missing
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;
      
      if (jwtSecret) {
        try {
          const payload = verifyAccessToken(token, jwtSecret);
          req.userId = payload.userId;
          req.deviceId = payload.deviceId;
          req.tokenJti = payload.jti;
        } catch {
          // Token invalid, but continue without user info
        }
      }
    }
    
    next();
  } catch {
    next();
  }
}


