import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_do_not_use_in_prod';

export const generateTokens = async (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '15m' });
  
  const refreshString = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const refreshToken = new RefreshToken({
    token: refreshString,
    user: userId,
    expiresAt
  });
  await refreshToken.save();

  return { accessToken, refreshToken: refreshString };
};

export const register = async (data: any) => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw new AppError(409, 'USER_EXISTS', 'User with this email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  const user = new User({
    name: data.name,
    email: data.email,
    passwordHash
  });
  await user.save();

  const tokens = await generateTokens(user.id);
  
  return {
    user: { id: user.id, name: user.name, email: user.email },
    ...tokens
  };
};

export const login = async (data: any) => {
  const user = await User.findOne({ email: data.email });
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const tokens = await generateTokens(user.id);
  
  return {
    user: { id: user.id, name: user.name, email: user.email },
    ...tokens
  };
};

export const refresh = async (token: string) => {
  const existingToken = await RefreshToken.findOne({ token }).populate('user');
  
  if (!existingToken || !existingToken.isActive) {
    throw new AppError(401, 'INVALID_TOKEN', 'Refresh token is invalid or expired');
  }

  // Revoke the old token (rotation)
  existingToken.revokedAt = new Date();
  await existingToken.save();

  // @ts-ignore
  const userId = existingToken.user._id.toString();
  const tokens = await generateTokens(userId);
  
  return tokens;
};

export const logout = async (token: string) => {
  await RefreshToken.findOneAndUpdate({ token }, { revokedAt: new Date() });
};

export const mockForgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) return; // Silent return for security

  const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
  console.log(`[MOCK EMAIL] Password reset requested for ${email}. Link: http://localhost:5173/reset-password?token=${resetToken}`);
};
