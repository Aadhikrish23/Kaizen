import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/api';

export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: any) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    };
    return res.status(err.statusCode).json(response);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
        details: err.errors
      }
    };
    return res.status(400).json(response);
  }

  // Handle Mongoose cast errors (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid resource ID: ${err.value}`
      }
    };
    return res.status(400).json(response);
  }

  // Fallback for unhandled server errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    }
  };
  res.status(500).json(response);
};
