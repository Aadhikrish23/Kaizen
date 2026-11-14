import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from './User';
import RefreshToken from './RefreshToken';
import { hashToken, consumeRefreshToken } from './refreshTokenUtils';
import { AppError } from '../../middleware/errorHandler';

import { getJwtSecret, getJwtRefreshSecret } from '../../config/secrets';

export const generateTokens = async (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '15m' });
  
  const refreshString = jwt.sign({ id: userId }, getJwtRefreshSecret(), { expiresIn: '7d' });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const refreshToken = new RefreshToken({
    tokenHash: hashToken(refreshString),
    user: userId,
    expiresAt
  });
  await refreshToken.save();

  return { accessToken, refreshToken: refreshString };
};

export const formatUserResponse = (user: any) => ({
  id: user._id?.toString() || user.id,
  name: user.name,
  email: user.email,
  role: user.role || 'user',
  onboardingComplete: !!user.onboardingComplete,
  dob: user.dob,
  gender: user.gender,
  heightCm: user.heightCm,
  currentWeightKg: user.currentWeightKg,
  activityLevel: user.activityLevel,
  goal: user.goal,
  targetWeightKg: user.targetWeightKg,
  calorieDailyTarget: user.calorieDailyTarget,
  proteinDailyTargetG: user.proteinDailyTargetG,
  waterDailyTargetMl: user.waterDailyTargetMl,
  units: user.units || 'metric',
  healthScore: user.healthScore,
  xp: user.xp,
  level: user.level,
  streakDays: user.streakDays,
});

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
    passwordHash,
    onboardingComplete: false,
  });
  await user.save();

  const tokens = await generateTokens(user.id);
  
  return {
    user: formatUserResponse(user),
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
    user: formatUserResponse(user),
    ...tokens
  };
};

export const refresh = async (token: string) => {
  // Single atomic delete: a replayed or concurrent request finds nothing and gets 401.
  const userId = await consumeRefreshToken(RefreshToken, token);
  if (!userId) {
    throw new AppError(401, 'INVALID_TOKEN', 'Refresh token is invalid or expired');
  }

  return generateTokens(userId);
};

export const logout = async (token: string) => {
  await RefreshToken.findOneAndUpdate({ tokenHash: hashToken(token) }, { revokedAt: new Date() });
};

export const mockForgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) return; // Silent return for security

  const resetToken = jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: '1h' });
  console.log(`[MOCK EMAIL] Password reset requested for ${email}. Link: http://localhost:5173/reset-password?token=${resetToken}`);
};
