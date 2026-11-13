import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    dob: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    heightCm: z.number().positive().max(300).optional(),
    currentWeightKg: z.number().positive().max(500).optional(),
    activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']).optional(),
    goal: z.enum(['lose_weight', 'gain_weight', 'maintain_weight']).optional(),
    targetWeightKg: z.number().positive().max(500).optional(),
    targetDate: z.string().optional(),
    calorieDailyTarget: z.number().positive().optional(),
    proteinDailyTargetG: z.number().positive().optional(),
    waterDailyTargetMl: z.number().positive().optional(),
    units: z.enum(['metric', 'imperial']).optional()
  })
});

export const completeOnboardingSchema = z.object({
  body: z.object({
    dob: z.string(),
    gender: z.enum(['male', 'female', 'other']),
    heightCm: z.number().positive().max(300),
    currentWeightKg: z.number().positive().max(500),
    activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']),
    goal: z.enum(['lose_weight', 'gain_weight', 'maintain_weight']),
    targetWeightKg: z.number().positive().max(500).optional(),
    calorieDailyTarget: z.number().positive().optional(),
    proteinDailyTargetG: z.number().positive().optional(),
    waterDailyTargetMl: z.number().positive().optional()
  })
});
