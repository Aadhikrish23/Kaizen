import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ErrorResponse } from '../types/api';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          }
        };
        return res.status(400).json(response);
      }
      return next(error);
    }
  };
};
