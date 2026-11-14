import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../features/auth/User';
import { AppError } from './errorHandler';
import { getJwtSecret } from '../config/secrets';


export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authorized to access this route'));
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
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
