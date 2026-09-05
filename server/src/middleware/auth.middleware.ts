import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authorized to access this route'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'User belonging to token no longer exists'));
    }

    // @ts-ignore
    req.user = user;
    next();
  } catch (err) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authorized to access this route'));
  }
};
