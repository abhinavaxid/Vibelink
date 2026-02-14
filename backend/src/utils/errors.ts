import { Request, Response, NextFunction } from 'express';

/**
 * Custom API Error Class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Common HTTP Errors
 */
export const HttpErrors = {
  BadRequest: (message: string, details?: any) =>
    new ApiError(400, message, details),

  Unauthorized: (message: string = 'Unauthorized') =>
    new ApiError(401, message),

  Forbidden: (message: string = 'Forbidden') =>
    new ApiError(403, message),

  NotFound: (message: string = 'Not found') =>
    new ApiError(404, message),

  Conflict: (message: string, details?: any) =>
    new ApiError(409, message, details),

  ValidationError: (details: any) =>
    new ApiError(422, 'Validation failed', details),

  InternalServerError: (message: string = 'Internal server error') =>
    new ApiError(500, message),

  ServiceUnavailable: (message: string = 'Service unavailable') =>
    new ApiError(503, message),
};

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('❌ Error:', err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Handle database errors
  if (err.code === '23505') {
    // Unique constraint violation
    const field = err.detail?.match(/Key \((.*?)\)/)?.[1] || 'field';
    res.status(409).json({
      success: false,
      error: {
        message: `${field} already exists`,
        code: 'DUPLICATE_ENTRY',
      },
    });
    return;
  }

  if (err.code === '23503') {
    // Foreign key constraint violation
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid reference to related data',
        code: 'FOREIGN_KEY_VIOLATION',
      },
    });
    return;
  }

  if (err.code === '42P01') {
    // Table doesn't exist
    res.status(500).json({
      success: false,
      error: {
        message: 'Database schema not initialized',
        code: 'SCHEMA_ERROR',
      },
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  });
}

/**
 * Async route wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  ApiError,
  HttpErrors,
  errorHandler,
  asyncHandler,
};
