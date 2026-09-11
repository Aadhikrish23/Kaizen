import axios from 'axios';
import MealLog from '../models/MealLog';
import WaterLog from '../models/WaterLog';
import WorkoutLog from '../models/WorkoutLog';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const buildUserHealthContext = async (user: any, targetDate?: string) => {
  const date = targetDate || new Date().toISOString().split('T')[0];
  const userId = user._id || user.id;

  // Aggregate today's nutrition
  const meals = await MealLog.find({ userId, date });
  const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const totalProteinG = meals.reduce((acc, m) => acc + (m.protein || 0), 0);
  const totalCarbsG = meals.reduce((acc, m) => acc + (m.carbs || 0), 0);
  const totalFatG = meals.reduce((acc, m) => acc + (m.fat || 0), 0);

  // Aggregate today's water
  const waterEntries = await WaterLog.find({ userId, date });
  const waterMl = waterEntries.reduce((acc, w) => acc + (w.amount || 0), 0);

  // Aggregate today's workouts
  const workouts = await WorkoutLog.find({ userId, date });
  const workoutsLogged = workouts.length;
  const totalVolumeKg = workouts.reduce((acc, w) => acc + (w.totalVolumeKg || 0), 0);

  const calTarget = user.calorieDailyTarget || 2000;
  const proTarget = user.proteinDailyTargetG || 150;
  const waterTarget = user.waterDailyTargetMl || 2500;

  const userProfile = {
    name: user.name,
    gender: user.gender,
    currentWeightKg: user.currentWeightKg,
    heightCm: user.heightCm,
    goal: user.goal,
    activityLevel: user.activityLevel,
    calorieDailyTarget: calTarget,
    proteinDailyTargetG: proTarget,
    waterDailyTargetMl: waterTarget,
  };

  const dailyMetrics = {
    date,
    totalCalories,
    remainingCalories: Math.max(0, calTarget - totalCalories),
    totalProteinG,
    remainingProteinG: Math.max(0, proTarget - totalProteinG),
    totalCarbsG,
    totalFatG,
    waterMl,
    remainingWaterMl: Math.max(0, waterTarget - waterMl),
    workoutsLogged,
    totalVolumeKg,
  };

  return { userProfile, dailyMetrics };
};

export const chatWithCoach = async (
  user: any,
  message: string,
  history: ChatHistoryMessage[] = [],
  targetDate?: string
) => {
  const { userProfile, dailyMetrics } = await buildUserHealthContext(user, targetDate);

  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/coach/chat`,
      {
        message,
        conversation_history: history,
        user_profile: userProfile,
        daily_metrics: dailyMetrics,
      },
      { timeout: 45000 }
    );

    return {
      reply: response.data.reply,
      modelUsed: response.data.model_used,
      contextApplied: response.data.context_applied,
      source: response.data.source,
    };
  } catch (error: any) {
    console.warn(`[AI Microservice] FastAPI unreachable or timed out (${error.message}). Using resilient fallback.`);
    
    // Fallback response with injected stats
    const remCal = dailyMetrics.remainingCalories;
    const remPro = dailyMetrics.remainingProteinG;
    return {
      reply: `I see you asked about "${message}". As your Kaizen Coach, based on today's logged data, you have ${remCal} kcal and ${remPro}g protein remaining. Focus on lean protein, clean hydration, and quality rest!`,
      modelUsed: 'heuristic-fallback',
      contextApplied: true,
      source: 'fallback',
    };
  }
};

export const getDailyInsight = async (user: any, targetDate?: string) => {
  const { userProfile, dailyMetrics } = await buildUserHealthContext(user, targetDate);

  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/coach/insights`,
      {
        user_profile: userProfile,
        daily_metrics: dailyMetrics,
      },
      { timeout: 15000 }
    );

    return {
      insight: response.data.insight,
      category: response.data.category,
      modelUsed: response.data.model_used,
    };
  } catch (error: any) {
    const remCal = dailyMetrics.remainingCalories;
    const remPro = dailyMetrics.remainingProteinG;
    return {
      insight: remCal > 0
        ? `You have ${remCal} kcal and ${remPro}g protein left today -- stay consistent and fuel recovery.`
        : `Calorie target reached! Prioritize hydration and 7-8 hours of sleep for optimal recovery.`,
      category: 'daily',
      modelUsed: 'heuristic-fallback',
    };
  }
};
