import { AppError } from '../../middleware/errorHandler';
import { todayInTz } from '../../utils/dates';
import { detectGoalChange, isFutureDate, normalizeDate } from '../goals/goals.logic';
import { recordGoalChange } from '../goals/goals.service';
import User from '../auth/User';

// Activity multipliers for Mifflin-St Jeor TDEE
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9
};

export const computeTDEE = (user: {
  gender?: string;
  dob?: Date;
  heightCm?: number;
  currentWeightKg?: number;
  activityLevel?: string;
  goal?: string;
}): { tdee: number; recommendedCalories: number; recommendedProteinG: number } => {
  if (!user.heightCm || !user.currentWeightKg || !user.dob || !user.gender) {
    return { tdee: 2000, recommendedCalories: 2000, recommendedProteinG: 150 };
  }

  const ageYears = Math.floor((Date.now() - new Date(user.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  // Mifflin-St Jeor BMR
  let bmr =
    user.gender === 'male'
      ? 10 * user.currentWeightKg + 6.25 * user.heightCm - 5 * ageYears + 5
      : 10 * user.currentWeightKg + 6.25 * user.heightCm - 5 * ageYears - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[(user.activityLevel as keyof typeof ACTIVITY_MULTIPLIERS)] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  let recommendedCalories = tdee;
  if (user.goal === 'lose_weight') recommendedCalories = tdee - 500;
  if (user.goal === 'gain_weight') recommendedCalories = tdee + 300;

  // ~2g protein per kg of bodyweight
  const recommendedProteinG = Math.round(user.currentWeightKg * 2);

  return { tdee, recommendedCalories, recommendedProteinG };
};

export const getProfile = async (userId: string) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw new Error('User not found');

  const tdeeData = computeTDEE(user as any);
  return { user, tdeeData };
};

export const updateProfile = async (userId: string, data: any) => {
  const before: any = await User.findById(userId).select('goal targetWeightKg targetDate currentWeightKg timezone').lean();
  const snapshotBefore = { goal: before?.goal, targetWeightKg: before?.targetWeightKg, targetDate: normalizeDate(before?.targetDate) };
  const changed = detectGoalChange(snapshotBefore, data);

  // A changed target date must be a real date in the future (in the user's timezone)
  if (changed.includes('targetDate') && data.targetDate) {
    const today = todayInTz(data.timezone ?? before?.timezone);
    if (!isFutureDate(normalizeDate(data.targetDate) as string, today)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Target date must be in the future');
    }
  }

  const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true }).select('-passwordHash');
  if (user && changed.length) {
    await recordGoalChange(
      userId,
      { goal: user.goal, targetWeightKg: user.targetWeightKg, targetDate: normalizeDate(user.targetDate) },
      changed,
      data.currentWeightKg ?? before?.currentWeightKg ?? null
    );
  }
  return user;
};

export const completeOnboarding = async (userId: string, data: any) => {
  const tdeeData = computeTDEE(data);

  const updateData = {
    ...data,
    calorieDailyTarget: data.calorieDailyTarget || tdeeData.recommendedCalories,
    proteinDailyTargetG: data.proteinDailyTargetG || tdeeData.recommendedProteinG,
    waterDailyTargetMl: data.waterDailyTargetMl || 2500,
    onboardingComplete: true
  };

  const before: any = await User.findById(userId).select('goal targetWeightKg targetDate').lean();
  const changed = detectGoalChange({ goal: before?.goal, targetWeightKg: before?.targetWeightKg, targetDate: normalizeDate(before?.targetDate) }, updateData);
  const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-passwordHash');
  if (user && changed.length) {
    await recordGoalChange(userId, { goal: user.goal, targetWeightKg: user.targetWeightKg, targetDate: normalizeDate(user.targetDate) }, changed, user.currentWeightKg ?? null);
  }
  return { user, tdeeData };
};
