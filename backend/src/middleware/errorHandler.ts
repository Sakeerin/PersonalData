import { Request, Response, NextFunction } from 'express';
import { createErrorResponse, AppError } from '../utils/errors';

/**
 * Error handling middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json(createErrorResponse(err));
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message
      }
    });
    return;
  }

  // Handle database errors
  if (err.code === '23505') { // Unique violation
    res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Resource already exists'
      }
    });
    return;
  }

  // Default error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
}
