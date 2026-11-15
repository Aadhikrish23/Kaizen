import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../features/auth/User';
import { AppError } from './errorHandler';
import { getJwtSecret } from '../config/secrets';


/** Legacy users (no isActive field) are active; only an explicit false deactivates. */
export const isAccountActive = (user: { isActive?: boolean | null } | null | undefined): boolean => !!user && user.isActive !== false;

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

    // A deactivated account stops working immediately, even with a still-valid access token
    if (!isAccountActive(user)) {
      return next(new AppError(401, 'ACCOUNT_DISABLED', 'This account has been deactivated'));
    }

    // @ts-ignore
    req.user = user;
    next();
  } catch (err) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authorized to access this route'));
  }
};
