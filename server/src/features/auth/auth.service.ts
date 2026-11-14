import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from './User';
import RefreshToken from './RefreshToken';
import { hashToken, consumeRefreshToken, signRefreshToken } from './refreshTokenUtils';
import { isValidTimezone } from '../../utils/dates';
import { AppError } from '../../middleware/errorHandler';

import { getJwtSecret, getJwtRefreshSecret } from '../../config/secrets';

export const generateTokens = async (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '15m' });
  
  const refreshString = signRefreshToken(userId, getJwtRefreshSecret());
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
  timezone: user.timezone || 'UTC',
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
    ...(isValidTimezone(data.timezone) ? { timezone: data.timezone } : {}),
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

  // Adopt the browser timezone only while the account is still on the default.
  if (isValidTimezone(data.timezone) && (!user.timezone || user.timezone === 'UTC') && data.timezone !== 'UTC') {
    user.timezone = data.timezone;
    await user.save();
  }

  const tokens = await generateTokens(user.id);
  
  return {
    user: formatUserResponse(user),
    ...tokens
  };
};

export const refresh = async (token: string) => {
  const invalid = () => new AppError(401, 'INVALID_TOKEN', 'Refresh token is invalid or expired');

  // Defence in depth: reject anything not signed by us before touching the database.
  try {
    jwt.verify(token, getJwtRefreshSecret());
  } catch {
    throw invalid();
  }

  // Single atomic delete: a replayed or concurrent request finds nothing and gets 401.
  const userId = await consumeRefreshToken(RefreshToken, token);
  if (!userId || !(await User.exists({ _id: userId }))) {
    throw invalid();
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
