import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { HttpErrors } from '../utils/errors';

/**
 * Extended Request interface with user data
 */
export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    username: string;
  };
  [key: string]: any;
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (!token) {
      throw HttpErrors.Unauthorized('Missing authorization token');
    }

    const payload = verifyToken(token);

    if (!payload) {
      throw HttpErrors.Unauthorized('Invalid or expired token');
    }

    req.userId = payload.userId;
    req.user = {
      id: payload.userId,
      email: payload.email,
      username: payload.username,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: {
          message: error.message,
        },
      });
      return;
    }
    res.status(401).json({
      success: false,
      error: { message: 'Unauthorized' },
    });
  }
}

/**
 * Optional authentication middleware
 * Doesn't fail if token is missing, but validates if provided
 */
export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.user = {
        id: payload.userId,
        email: payload.email,
        username: payload.username,
      };
    }
  }

  next();
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
}

/**
 * Request logging middleware
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '❌' : '✅';

    console.log(
      `${statusColor} ${req.method} ${req.path} - ${statusCode} (${duration}ms)`
    );

    return originalJson(data);
  };

  next();
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const requestCounts = new Map<string, number[]>();

export function rateLimitMiddleware(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }

    const timestamps = requestCounts.get(ip)!;
    const recentRequests = timestamps.filter((t) => now - t < windowMs);

    if (recentRequests.length >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(
            (Math.min(...recentRequests) + windowMs - now) / 1000
          ),
        },
      });
      return;
    }

    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);

    next();
  };
}

/**
 * CORS middleware configuration
 */
export function corsMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    
    // Support wildcard
    if (corsOrigin === '*') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    } else {
      const allowedOrigins = corsOrigin.split(',');
      const origin = req.headers.origin;

      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      }
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    }

    res.header(
      'Access-Control-Allow-Headers',
      'Origin,X-Requested-With,Content-Type,Accept,Authorization'
    );

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  };
}

export default {
  authMiddleware,
  optionalAuthMiddleware,
  loggingMiddleware,
  rateLimitMiddleware,
  corsMiddleware,
};
