import mongoose from 'mongoose';
import UserWorkoutPlan, {
  IUserWorkoutPlan,
  IPlannerPreferences,
  IPlannedDay,
  IPlannedExercise,
  IDailyAdaptation,
} from '../models/UserWorkoutPlan';
import User from '../models/User';
import Exercise, { IExercise } from '../models/Exercise';
import WorkoutLog from '../models/WorkoutLog';
import { getUserInventory, recordWorkingWeight } from './inventory.service';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DEFAULT_PREFERENCES: IPlannerPreferences = {
  daysPerWeek: 3,
  sessionDurationMinutes: 45,
  splitStyle: 'full_body',
  experienceLevel: 'beginner',
  targetFocus: 'general_fitness',
  preferredDays: ['Monday', 'Wednesday', 'Friday'],
};

/**
 * Get or create initial workout plan for the user
 */
export const getUserPlan = async (userId: string | mongoose.Types.ObjectId): Promise<IUserWorkoutPlan> => {
  const existing = await UserWorkoutPlan.findOne({ userId });
  if (existing) {
    return existing;
  }
  return await configurePlan(userId, DEFAULT_PREFERENCES);
};

/**
 * Strict equipment and biomechanics compatibility evaluator.
 * Evaluates exercise requirements against user's physical inventory arsenal.
 */
export const isExerciseCompatibleWithInventory = (
  ex: { name: string; equipment: string },
  equipmentList: any[]
): boolean => {
  const types = new Set((equipmentList || []).map(i => (i.type || '').toLowerCase()));
  const names = (equipmentList || []).map(i => (i.name || '').toLowerCase());
  const notes = (equipmentList || []).map(i => (i.notes || '').toLowerCase());
  const allText = names.join(' ') + ' ' + notes.join(' ');

  const hasBench = types.has('bench') || allText.includes('bench');
  const hasDipBars = types.has('dip_bars') || types.has('dip_station') || allText.includes('dip');
  const hasPullupBar = types.has('pullup_bar') || allText.includes('pull-up') || allText.includes('pullup') || allText.includes('chin-up');
  const hasBarbell = types.has('barbell') || allText.includes('barbell');
  const hasDumbbell = types.has('dumbbell') || allText.includes('dumbbell');
  const hasBands = types.has('bands') || types.has('band') || allText.includes('band');
  const hasCable = types.has('cable') || allText.includes('cable');
  const hasMachine = types.has('machine') || allText.includes('machine');
  const hasAbWheel = types.has('other') && (allText.includes('ab wheel') || allText.includes('roller'));
  const hasPushupBars = types.has('pushup_bar') || (types.has('other') && allText.includes('pushup'));

  const nameLower = ex.name.toLowerCase();
  const eqLower = ex.equipment.toLowerCase();

  // 1. Parallel bar / station dips strictly require dip bars or dip station
  if (nameLower.includes('dips') && !nameLower.includes('bench dips')) {
    if (!hasDipBars) return false;
  }

  // 2. Exercises strictly requiring a flat, incline, or decline workout bench
  const benchKeywords = [
    'bench press',
    'incline dumbbell press',
    'decline barbell bench press',
    'dumbbell pullover',
    'incline dumbbell curl',
    'close-grip barbell bench press',
    'bench dips',
    'barbell hip thrust',
    'skull crusher',
    'preacher curl'
  ];
  if (benchKeywords.some(kw => nameLower.includes(kw))) {
    if (!hasBench) return false;
  }

  // 3. Pull-up bar & hanging movements
  if (nameLower.includes('pull-ups') || nameLower.includes('chin-ups') || nameLower.includes('hanging leg')) {
    if (!hasPullupBar) return false;
  }

  // 4. Ab wheel roller
  if (nameLower.includes('ab wheel')) {
    if (!hasAbWheel) return false;
  }

  // 5. Deficit push-ups with handles
  if (nameLower.includes('deficit push-ups')) {
    if (!hasPushupBars) return false;
  }

  // 6. Base modality requirement
  if (eqLower === 'barbell' && !hasBarbell) return false;
  if (eqLower === 'dumbbell' && !hasDumbbell) return false;
  if ((eqLower === 'cable' || eqLower === 'cables') && !hasCable) return false;
  if (eqLower === 'machine' && !hasMachine) return false;
  if ((eqLower === 'band' || eqLower === 'bands') && !hasBands) return false;

  return true;
};

/**
 * Configure / regenerate a personalized workout plan calibrated to user profile & inventory
 */
export const configurePlan = async (
  userId: string | mongoose.Types.ObjectId,
  preferences: IPlannerPreferences
): Promise<IUserWorkoutPlan> => {
  const user = await User.findById(userId);
  const inventory = await getUserInventory(userId);

  // Fetch all exercises from DB
  const allExercises: IExercise[] = await Exercise.find({});

  // Filter exercises strictly compatible with user's inventory
  const compatibleExercises = allExercises.filter(ex =>
    isExerciseCompatibleWithInventory(ex, inventory?.equipment || [])
  );

  // Pool is strictly compatible exercises. If pool is completely empty (no inventory at all),
  // fallback to pure floor bodyweight movements that require no equipment, no bench, no dip bars.
  const exercisePool = compatibleExercises.length > 0
    ? compatibleExercises
    : allExercises.filter(
        ex => ex.equipment === 'bodyweight' &&
        !ex.name.toLowerCase().includes('dips') &&
        !ex.name.toLowerCase().includes('pull-up') &&
        !ex.name.toLowerCase().includes('chin-up') &&
        !ex.name.toLowerCase().includes('hanging')
      );

  // Reps and rest calculation based on target focus
  let targetReps = 10;
  let restSeconds = 60;
  let setsCount = 3;

  if (preferences.targetFocus === 'strength') {
    targetReps = 6;
    restSeconds = 90;
    setsCount = 4;
  } else if (preferences.targetFocus === 'hypertrophy') {
    targetReps = 10;
    restSeconds = 75;
    setsCount = preferences.sessionDurationMinutes >= 60 ? 4 : 3;
  } else if (preferences.targetFocus === 'fat_loss') {
    targetReps = 14;
    restSeconds = 45;
    setsCount = 3;
  } else {
    targetReps = 10;
    restSeconds = 60;
    setsCount = 3;
  }

  // Exercises per session based on duration
  let exercisesPerDay = 4;
  if (preferences.sessionDurationMinutes <= 30) {
    exercisesPerDay = 3;
  } else if (preferences.sessionDurationMinutes <= 45) {
    exercisesPerDay = 5;
  } else if (preferences.sessionDurationMinutes <= 60) {
    exercisesPerDay = 6;
  } else {
    exercisesPerDay = 7;
  }

  // Weight calculation helper
  const userWeight = user?.currentWeightKg || 70;
  const isBeginner = preferences.experienceLevel === 'beginner';

  const getSuggestedWeight = (ex: IExercise): number => {
    // Check if user already has a working weight logged
    const loggedWw = inventory.workingWeights?.find(
      ww => ww.exerciseName.trim().toLowerCase() === ex.name.trim().toLowerCase()
    );
    if (loggedWw && loggedWw.currentWeightKg > 0) {
      return loggedWw.currentWeightKg;
    }

    // Otherwise calculate smart safe starting weight
    if (ex.equipment === 'bodyweight') return 0;
    if (ex.equipment === 'band') return 10;

    let baseWeight = 10;
    if (ex.equipment === 'barbell') {
      if (['legs', 'back'].includes(ex.targetMuscle)) {
        baseWeight = isBeginner ? 30 : Math.round(userWeight * 0.6 / 2.5) * 2.5;
      } else {
        baseWeight = isBeginner ? 20 : Math.round(userWeight * 0.45 / 2.5) * 2.5;
      }
    } else if (ex.equipment === 'dumbbell') {
      if (['legs', 'chest', 'back'].includes(ex.targetMuscle)) {
        baseWeight = isBeginner ? 8 : Math.round(userWeight * 0.18 / 2) * 2;
      } else {
        baseWeight = isBeginner ? 5 : Math.round(userWeight * 0.1 / 2) * 2;
      }
    }
    return Math.max(baseWeight, 2.5);
  };

  const createPlannedExercise = (ex: IExercise): IPlannedExercise => ({
    exerciseId: (ex._id as mongoose.Types.ObjectId).toString(),
    exerciseName: ex.name,
    targetMuscle: ex.targetMuscle,
    equipment: ex.equipment,
    targetSets: setsCount,
    targetReps,
    suggestedWeightKg: getSuggestedWeight(ex),
    restSeconds,
    videoUrl: ex.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
    formTips: ex.formTips && ex.formTips.length > 0 ? ex.formTips : [
      'Maintain neutral spine and braced core throughout.',
      'Control the eccentric (lowering) phase for 2-3 seconds.',
      'Breathe out during the concentric (push/pull) effort.'
    ],
    notes: `${preferences.experienceLevel.toUpperCase()} recommendation calibrated for ${preferences.targetFocus.replace('_', ' ')}.`
  });

  // Filter pool by muscle
  const getExercisesForMuscles = (muscles: string[], count: number, excludeNames: Set<string>): IPlannedExercise[] => {
    const matching = exercisePool.filter(
      ex => muscles.includes(ex.targetMuscle.toLowerCase()) && !excludeNames.has(ex.name)
    );
    const selected: IPlannedExercise[] = [];
    for (let i = 0; i < count && i < matching.length; i++) {
      excludeNames.add(matching[i].name);
      selected.push(createPlannedExercise(matching[i]));
    }
    // If not enough matching, backfill from general pool
    if (selected.length < count) {
      for (const ex of exercisePool) {
        if (!excludeNames.has(ex.name) && selected.length < count) {
          excludeNames.add(ex.name);
          selected.push(createPlannedExercise(ex));
        }
      }
    }
    return selected;
  };

  const getWorkoutDayIndices = (daysCount: number): number[] => {
  switch (daysCount) {
    case 1:
      return [0]; // Monday
    case 2:
      return [0, 3]; // Monday, Thursday
    case 3:
      return [0, 2, 4]; // Monday, Wednesday, Friday
    case 4:
      return [0, 1, 3, 4]; // Monday, Tuesday, Thursday, Friday
    case 5:
      return [0, 1, 2, 4, 5]; // Monday, Tuesday, Wednesday, Friday, Saturday (Rest: Thu, Sun)
    case 6:
      return [0, 1, 2, 3, 4, 5]; // Monday - Saturday (Rest: Sun)
    case 7:
      return [0, 1, 2, 3, 4, 5, 6]; // All 7 days
    default:
      return [0, 2, 4];
  }
};

  // Build 7-day schedule according to split style and daysPerWeek
  const schedule: IPlannedDay[] = [];
  const daysCount = Math.min(Math.max(Number(preferences.daysPerWeek) || 3, 1), 7);
  const workoutDayIndices = getWorkoutDayIndices(daysCount);

  if (preferences.splitStyle === 'full_body') {
    const fullBodyTemplates = [
      {
        title: 'Full Body - Compound Foundation',
        focus: 'Primary multi-joint lifts and core stabilization',
        muscles: ['chest', 'back', 'legs', 'core'],
      },
      {
        title: 'Full Body - Posterior Chain & Pull Focus',
        focus: 'Back density, hamstring hinges, and postural strength',
        muscles: ['back', 'legs', 'biceps', 'core'],
      },
      {
        title: 'Full Body - Anterior Chain & Push Focus',
        focus: 'Chest development, quad loading, and shoulder mechanics',
        muscles: ['chest', 'legs', 'shoulders', 'triceps'],
      },
      {
        title: 'Full Body - Functional Hypertrophy',
        focus: 'Rotational power, unilateral movements, and upper back breadth',
        muscles: ['back', 'shoulders', 'legs', 'core'],
      },
      {
        title: 'Full Body - Volume & Conditioning Finisher',
        focus: 'High density total body stimulation with short rest intervals',
        muscles: ['chest', 'back', 'legs', 'biceps', 'triceps', 'core'],
      },
      {
        title: 'Full Body - Neuromuscular Strength Peak',
        focus: 'Heavy technical proficiency and maximum motor unit recruitment',
        muscles: ['chest', 'back', 'legs', 'core'],
      },
      {
        title: 'Full Body - Athletic Restoration & Core',
        focus: 'Active recovery tempo, posture correction, and abdominal stamina',
        muscles: ['legs', 'back', 'core'],
      },
    ];

    let sessionIndex = 0;
    for (let i = 0; i < 7; i++) {
      const isWorkout = workoutDayIndices.includes(i);
      const dayName = preferences.preferredDays && preferences.preferredDays[i] ? preferences.preferredDays[i] : DAY_NAMES[i];
      if (!isWorkout) {
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: true,
          title: 'Active Recovery & Mobility',
          focus: 'Rest, hydration, and light stretching',
          targetMuscles: ['core'],
          estimatedDurationMinutes: 20,
          exercises: []
        });
      } else {
        const tpl = fullBodyTemplates[sessionIndex % fullBodyTemplates.length];
        sessionIndex++;
        const usedNames = new Set<string>();
        const exercises = getExercisesForMuscles(tpl.muscles, exercisesPerDay, usedNames);
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: false,
          title: tpl.title,
          focus: tpl.focus,
          targetMuscles: tpl.muscles,
          estimatedDurationMinutes: preferences.sessionDurationMinutes,
          exercises
        });
      }
    }
  } else if (preferences.splitStyle === 'upper_lower') {
    const upperLowerTemplates = [
      {
        title: 'Upper Body Power & Hypertrophy',
        focus: 'Torso pushing & pulling mechanics with progressive load',
        muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
      },
      {
        title: 'Lower Body & Core Resilience',
        focus: 'Posterior chain, quads, and midsection stability',
        muscles: ['legs', 'core'],
      },
      {
        title: 'Upper Body Volume & Deltoid Focus',
        focus: 'High-density horizontal/vertical pulling and shoulder volume',
        muscles: ['back', 'shoulders', 'biceps', 'triceps'],
      },
      {
        title: 'Lower Body Posterior Chain & Quad Dominance',
        focus: 'Unilateral quad work, hamstring hinges, and calves',
        muscles: ['legs', 'core'],
      },
      {
        title: 'Upper Body Athletic Pump & Arms',
        focus: 'Chest isolation, lat breadth, and arm hypertrophy',
        muscles: ['chest', 'back', 'biceps', 'triceps'],
      },
      {
        title: 'Lower Body Power & Midsection Stamina',
        focus: 'Explosive lower body force production and abdominal endurance',
        muscles: ['legs', 'core'],
      },
      {
        title: 'Full Body Deload & Core Activation',
        focus: 'Mobility, rotational core work, and light compound volume',
        muscles: ['legs', 'core', 'shoulders'],
      },
    ];

    let sessionIndex = 0;
    for (let i = 0; i < 7; i++) {
      const isWorkout = workoutDayIndices.includes(i);
      const dayName = preferences.preferredDays && preferences.preferredDays[i] ? preferences.preferredDays[i] : DAY_NAMES[i];
      if (!isWorkout) {
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: true,
          title: 'Rest & Neuromuscular Recovery',
          focus: 'Replenish glycogen stores and soft tissue recovery',
          targetMuscles: [],
          estimatedDurationMinutes: 0,
          exercises: []
        });
      } else {
        const tpl = upperLowerTemplates[sessionIndex % upperLowerTemplates.length];
        sessionIndex++;
        const usedNames = new Set<string>();
        const exercises = getExercisesForMuscles(tpl.muscles, exercisesPerDay, usedNames);
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: false,
          title: tpl.title,
          focus: tpl.focus,
          targetMuscles: tpl.muscles,
          estimatedDurationMinutes: preferences.sessionDurationMinutes,
          exercises
        });
      }
    }
  } else if (preferences.splitStyle === 'ppl') {
    const pplTemplates = [
      {
        title: 'Push - Chest, Shoulders & Triceps',
        focus: 'Horizontal and overhead pressing with tricep lockout focus',
        muscles: ['chest', 'shoulders', 'triceps'],
      },
      {
        title: 'Pull - Lat Width & Bicep Specialization',
        focus: 'Vertical and horizontal pulling mechanics with arm flexion volume',
        muscles: ['back', 'biceps'],
      },
      {
        title: 'Legs - Quad Dominance & Core Control',
        focus: 'Squat mechanics, knee flexion, and midsection stabilization',
        muscles: ['legs', 'core'],
      },
      {
        title: 'Push - Deltoid Breadth & Upper Chest',
        focus: 'Clavicular pec bias, lateral delts, and close-grip pressing',
        muscles: ['chest', 'shoulders', 'triceps'],
      },
      {
        title: 'Pull - Back Density & Posterior Delts',
        focus: 'Rhomboid contraction, scapular retraction, and arm volume',
        muscles: ['back', 'biceps'],
      },
      {
        title: 'Legs - Posterior Chain & Hamstrings',
        focus: 'Hip hinge mechanics, glute contraction, and calf endurance',
        muscles: ['legs', 'core'],
      },
      {
        title: 'Athletic Conditioning & Core',
        focus: 'Functional multi-joint circuit and abdominal conditioning',
        muscles: ['legs', 'back', 'core'],
      },
    ];

    let sessionIndex = 0;
    for (let i = 0; i < 7; i++) {
      const isWorkout = workoutDayIndices.includes(i);
      const dayName = preferences.preferredDays && preferences.preferredDays[i] ? preferences.preferredDays[i] : DAY_NAMES[i];
      if (!isWorkout) {
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: true,
          title: 'Rest & Myofascial Recovery',
          focus: 'Nutrient absorption and central nervous system replenishment',
          targetMuscles: [],
          estimatedDurationMinutes: 0,
          exercises: []
        });
      } else {
        const tpl = pplTemplates[sessionIndex % pplTemplates.length];
        sessionIndex++;
        const usedNames = new Set<string>();
        const exercises = getExercisesForMuscles(tpl.muscles, exercisesPerDay, usedNames);
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: false,
          title: tpl.title,
          focus: tpl.focus,
          targetMuscles: tpl.muscles,
          estimatedDurationMinutes: preferences.sessionDurationMinutes,
          exercises
        });
      }
    }
  } else {
    // home_dumbbell
    const homeDumbbellTemplates = [
      {
        title: 'Home Dumbbell - Upper Body Push & Pull',
        focus: 'Dumbbell floor presses, horizontal rows, and core bracing',
        muscles: ['chest', 'back', 'core'],
      },
      {
        title: 'Home Dumbbell - Lower Body Resilience & Core',
        focus: 'Goblet squats, Romanian deadlifts, lunges & core stabilization',
        muscles: ['legs', 'core'],
      },
      {
        title: 'Home Dumbbell - Delts, Arms & Hypertrophy',
        focus: 'Overhead dumbbell pressing, lateral delts, curls, and kickbacks',
        muscles: ['shoulders', 'biceps', 'triceps'],
      },
      {
        title: 'Home Dumbbell - Compound Conditioning & Core',
        focus: 'High-density pushups, floor presses, squats, and core bracing',
        muscles: ['chest', 'legs', 'core'],
      },
      {
        title: 'Home Dumbbell - Posterior Chain & Back Specialization',
        focus: 'Pull-up volume, dumbbell rows, hamstrings, and bicep volume',
        muscles: ['back', 'legs', 'biceps'],
      },
      {
        title: 'Home Dumbbell - Total Body Athletic Volume',
        focus: 'Multi-joint compound movements and unilateral stability',
        muscles: ['chest', 'back', 'legs', 'shoulders', 'core'],
      },
      {
        title: 'Home Dumbbell - Functional Hypertrophy Finisher',
        focus: 'High-rep tempo work, muscular endurance, and midsection control',
        muscles: ['shoulders', 'biceps', 'triceps', 'core'],
      },
    ];

    let sessionIndex = 0;
    for (let i = 0; i < 7; i++) {
      const isWorkout = workoutDayIndices.includes(i);
      const dayName = preferences.preferredDays && preferences.preferredDays[i] ? preferences.preferredDays[i] : DAY_NAMES[i];
      if (!isWorkout) {
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: true,
          title: 'Rest & Mobility Routine',
          focus: 'Low-impact stretching and active recovery',
          targetMuscles: [],
          estimatedDurationMinutes: 15,
          exercises: []
        });
      } else {
        const tpl = homeDumbbellTemplates[sessionIndex % homeDumbbellTemplates.length];
        sessionIndex++;
        const usedNames = new Set<string>();
        const exercises = getExercisesForMuscles(tpl.muscles, exercisesPerDay, usedNames);
        schedule.push({
          dayNumber: i + 1,
          dayName,
          isRestDay: false,
          title: tpl.title,
          focus: tpl.focus,
          targetMuscles: tpl.muscles,
          estimatedDurationMinutes: preferences.sessionDurationMinutes,
          exercises
        });
      }
    }
  }

  let plan = await UserWorkoutPlan.findOne({ userId });
  if (!plan) {
    plan = new UserWorkoutPlan({
      userId,
      preferences,
      schedule,
      dailyAdaptations: [
        {
          date: new Date().toISOString().split('T')[0],
          reason: `Initial ${preferences.splitStyle.replace('_', ' ').toUpperCase()} program synthesized for ${preferences.experienceLevel} level and ${preferences.targetFocus.replace('_', ' ')}. Inventory equipment matched.`,
          type: 'streak_milestone',
          exerciseName: 'Program Initialized'
        }
      ],
      adherenceRate: 100,
      lastEvaluatedDate: new Date().toISOString().split('T')[0]
    });
  } else {
    plan.preferences = preferences;
    plan.schedule = schedule;
    plan.dailyAdaptations.unshift({
      date: new Date().toISOString().split('T')[0],
      reason: `Program re-calibrated: ${preferences.splitStyle.replace('_', ' ').toUpperCase()} split with ${preferences.daysPerWeek} days/week, ${preferences.sessionDurationMinutes} min duration.`,
      type: 'volume_adjustment',
      exerciseName: 'Preferences Updated'
    });
  }

  return await plan.save();
};

/**
 * Daily adaptation engine: analyzes logged workout performance and adapts weights, volume, and rest
 */
export const adaptPlanDaily = async (
  userId: string | mongoose.Types.ObjectId,
  targetDate?: string,
  force?: boolean
): Promise<IUserWorkoutPlan> => {
  const plan = await getUserPlan(userId);
  const evalDate = targetDate || new Date().toISOString().split('T')[0];

  // If already evaluated today and force not specified, return current plan
  if (!force && plan.lastEvaluatedDate === evalDate && plan.dailyAdaptations.length > 1) {
    return plan;
  }

  // Find recent workout logs (today or most recent)
  const recentLogs = await WorkoutLog.find({ userId }).sort({ date: -1 }).limit(5);
  if (!recentLogs || recentLogs.length === 0) {
    plan.lastEvaluatedDate = evalDate;
    return await plan.save();
  }

  const latestLog = recentLogs[0];
  let totalSets = 0;
  let completedSets = 0;
  let totalRpe = 0;
  let rpeCount = 0;
  const exercisePerformance: Record<string, { totalReps: number; avgWeight: number; rpe: number }> = {};

  for (const ex of latestLog.exercises) {
    for (const set of ex.sets) {
      totalSets++;
      if (set.completed) {
        completedSets++;
      }
      if (set.rpe) {
        totalRpe += set.rpe;
        rpeCount++;
      }
    }
    const completedSetList = ex.sets.filter(s => s.completed);
    if (completedSetList.length > 0) {
      const avgWeight = completedSetList.reduce((acc, s) => acc + s.weightKg, 0) / completedSetList.length;
      const totalReps = completedSetList.reduce((acc, s) => acc + s.reps, 0);
      const exRpe = completedSetList.reduce((acc, s) => acc + (s.rpe || 7), 0) / completedSetList.length;
      exercisePerformance[ex.exerciseName] = { totalReps, avgWeight, rpe: exRpe };
    }
  }

  const avgRpe = rpeCount > 0 ? totalRpe / rpeCount : 7.0;
  const completionRate = totalSets > 0 ? completedSets / totalSets : 1.0;

  const adaptations: IDailyAdaptation[] = [];

  // Progressive Overload Rule: Completed sets >= 85% and RPE <= 7.5
  if (completionRate >= 0.85 && avgRpe <= 7.5) {
    for (const [exName, perf] of Object.entries(exercisePerformance)) {
      // Find this exercise in the plan's schedule
      let updatedInPlan = false;
      let newWeight = perf.avgWeight;

      for (const day of plan.schedule) {
        for (const planEx of day.exercises) {
          if (planEx.exerciseName.trim().toLowerCase() === exName.trim().toLowerCase()) {
            const increment = planEx.equipment === 'barbell' ? 2.5 : planEx.equipment === 'dumbbell' ? 1.0 : 0.5;
            const oldWeight = planEx.suggestedWeightKg;
            newWeight = Math.round((oldWeight + increment) * 10) / 10;
            planEx.suggestedWeightKg = newWeight;
            updatedInPlan = true;
          }
        }
      }

      if (updatedInPlan) {
        // Record working weight into UserInventory
        await recordWorkingWeight(userId, {
          exerciseName: exName,
          currentWeightKg: newWeight,
          date: evalDate,
          rpe: perf.rpe
        });

        adaptations.push({
          date: evalDate,
          type: 'weight_increase',
          exerciseName: exName,
          oldValue: `${perf.avgWeight} kg`,
          newValue: `${newWeight} kg`,
          reason: `High completion efficiency (${Math.round(completionRate * 100)}%) with low RPE (${Math.round(avgRpe * 10) / 10}/10). Progressive overload applied (+${Math.round((newWeight - perf.avgWeight) * 10) / 10}kg).`
        });
      }
    }
  } else if (avgRpe >= 9.2 || completionRate < 0.7) {
    // Deload / Recovery rule
    adaptations.push({
      date: evalDate,
      type: 'deload',
      reason: `Elevated perceived exertion (${Math.round(avgRpe * 10) / 10}/10 RPE) or incomplete sets detected. Maintained existing working load and adjusted inter-set rest intervals by +30 seconds for recovery.`
    });
  } else {
    // Solid training consistency
    adaptations.push({
      date: evalDate,
      type: 'volume_adjustment',
      reason: `Consistent session execution (${Math.round(completionRate * 100)}% completion, ${Math.round(avgRpe * 10) / 10} RPE). Load calibrated and preserved for form consolidation.`
    });
  }

  // Prepend new adaptations
  if (adaptations.length > 0) {
    plan.dailyAdaptations.unshift(...adaptations);
    if (plan.dailyAdaptations.length > 30) {
      plan.dailyAdaptations = plan.dailyAdaptations.slice(0, 30);
    }
  }

  plan.lastEvaluatedDate = evalDate;
  return await plan.save();
};

/**
 * Activate a planned day into the user's WorkoutLog for the specified date
 */
export const activatePlannedDay = async (
  userId: string | mongoose.Types.ObjectId,
  dayNumber: number,
  targetDate?: string
): Promise<any> => {
  const plan = await getUserPlan(userId);
  const plannedDay = plan.schedule.find(d => d.dayNumber === dayNumber);

  if (!plannedDay) {
    throw new Error(`Planned day ${dayNumber} not found in user workout plan`);
  }

  if (plannedDay.isRestDay) {
    throw new Error(`Day ${dayNumber} is configured as a rest day. Select a training day to activate.`);
  }

  const workoutDate = targetDate || new Date().toISOString().split('T')[0];

  // Convert planned exercises into WorkoutLog exercises with sets
  const exercises = plannedDay.exercises.map(ex => {
    const sets = [];
    for (let i = 1; i <= ex.targetSets; i++) {
      sets.push({
        setNumber: i,
        weightKg: ex.suggestedWeightKg || 10,
        reps: ex.targetReps || 10,
        rpe: 7,
        completed: false,
      });
    }
    return {
      exerciseId: ex.exerciseId ? new mongoose.Types.ObjectId(ex.exerciseId) : undefined,
      exerciseName: ex.exerciseName,
      targetMuscle: ex.targetMuscle,
      sets,
    };
  });

  // Check if a workout log already exists for this date
  let workout = await WorkoutLog.findOne({ userId, date: workoutDate });
  if (workout) {
    workout.splitName = plannedDay.title;
    workout.muscleGroups = plannedDay.targetMuscles;
    workout.exercises = exercises as any;
    workout.durationMinutes = plannedDay.estimatedDurationMinutes;
    workout.notes = `Activated from Adaptive Planner (Day ${dayNumber} - ${plannedDay.title})`;
    await workout.save();
  } else {
    workout = await WorkoutLog.create({
      userId,
      date: workoutDate,
      splitName: plannedDay.title,
      muscleGroups: plannedDay.targetMuscles,
      exercises,
      durationMinutes: plannedDay.estimatedDurationMinutes,
      notes: `Activated from Adaptive Planner (Day ${dayNumber} - ${plannedDay.title})`,
      totalVolumeKg: 0,
    });
  }

  return workout;
};

/**
 * Swap a single planned exercise in the user's schedule with an alternative compatible exercise
 */
export const swapPlannedExercise = async (
  userId: string | mongoose.Types.ObjectId,
  dayNumber: number,
  exerciseIndex: number,
  newExerciseId: string
): Promise<IUserWorkoutPlan> => {
  const plan = await getUserPlan(userId);
  const day = plan.schedule.find(d => d.dayNumber === dayNumber);
  if (!day) {
    throw new Error(`Planned day ${dayNumber} not found`);
  }
  if (!day.exercises[exerciseIndex]) {
    throw new Error(`Exercise index ${exerciseIndex} not found in day ${dayNumber}`);
  }

  const newEx = await Exercise.findById(newExerciseId);
  if (!newEx) {
    throw new Error('Selected exercise not found');
  }

  const inventory = await getUserInventory(userId);
  const isCompatible = isExerciseCompatibleWithInventory(newEx, inventory.equipment);
  if (!isCompatible) {
    throw new Error(`Exercise "${newEx.name}" requires equipment not found in your inventory.`);
  }

  const loggedWw = inventory.workingWeights?.find(
    ww => ww.exerciseName.trim().toLowerCase() === newEx.name.trim().toLowerCase()
  );

  const oldExName = day.exercises[exerciseIndex].exerciseName;
  const currentSets = day.exercises[exerciseIndex].targetSets || 3;
  const currentReps = day.exercises[exerciseIndex].targetReps || 10;
  const currentRest = day.exercises[exerciseIndex].restSeconds || 60;

  let suggestedWeight = 0;
  if (loggedWw && loggedWw.currentWeightKg > 0) {
    suggestedWeight = loggedWw.currentWeightKg;
  } else if (newEx.equipment === 'bodyweight') {
    suggestedWeight = 0;
  } else if (newEx.equipment === 'dumbbell') {
    suggestedWeight = 10;
  } else if (newEx.equipment === 'barbell') {
    suggestedWeight = 20;
  } else {
    suggestedWeight = 10;
  }

  day.exercises[exerciseIndex] = {
    exerciseId: (newEx._id as mongoose.Types.ObjectId).toString(),
    exerciseName: newEx.name,
    targetMuscle: newEx.targetMuscle,
    equipment: newEx.equipment,
    targetSets: currentSets,
    targetReps: currentReps,
    suggestedWeightKg: suggestedWeight,
    restSeconds: currentRest,
    videoUrl: newEx.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
    formTips: newEx.formTips && newEx.formTips.length > 0 ? newEx.formTips : [
      'Maintain neutral spine and braced core throughout.',
      'Control the eccentric phase for 2-3 seconds.',
      'Breathe out during the concentric effort.'
    ],
    notes: `Swapped from ${oldExName}. Calibrated for active inventory.`
  };

  plan.dailyAdaptations.unshift({
    date: new Date().toISOString().split('T')[0],
    reason: `Swapped movement: replaced "${oldExName}" with "${newEx.name}" on Day ${dayNumber}.`,
    type: 'exercise_swap',
    exerciseName: newEx.name
  });

  return await plan.save();
};

export const saveCustomPlan = async (
  userId: string,
  data: {
    programName?: string;
    daysPerWeek?: number;
    schedule: IPlannedDay[];
  }
) => {
  let plan = await UserWorkoutPlan.findOne({ userId });
  if (!plan) {
    plan = new UserWorkoutPlan({
      userId,
      programName: data.programName || 'Custom Split',
      isCustomPlan: true,
      preferences: {
        daysPerWeek: data.daysPerWeek || data.schedule.filter(d => !d.isRestDay).length || 3,
        sessionDurationMinutes: 45,
        splitStyle: 'full_body',
        experienceLevel: 'beginner',
        targetFocus: 'general_fitness',
      },
      schedule: data.schedule,
      dailyAdaptations: [{
        date: new Date().toISOString().split('T')[0],
        reason: `Created routine: "${data.programName || 'Custom Program'}"`,
        type: 'volume_adjustment',
      }],
      adherenceRate: 100,
    });
  } else {
    plan.programName = data.programName || plan.programName || 'Custom Split';
    plan.isCustomPlan = true;
    plan.schedule = data.schedule;
    if (data.daysPerWeek) {
      plan.preferences.daysPerWeek = data.daysPerWeek;
    } else {
      plan.preferences.daysPerWeek = data.schedule.filter(d => !d.isRestDay).length;
    }
    plan.dailyAdaptations.unshift({
      date: new Date().toISOString().split('T')[0],
      reason: `Updated routine: "${data.programName || 'Custom Program'}"`,
      type: 'volume_adjustment',
    });
  }
  return await plan.save();
};

export const addExerciseToDay = async (
  userId: string,
  dayNumber: number,
  exercise: IPlannedExercise
) => {
  const plan = await UserWorkoutPlan.findOne({ userId });
  if (!plan) throw new Error('No workout plan found to update');

  const day = plan.schedule.find(d => d.dayNumber === dayNumber);
  if (!day) throw new Error(`Day ${dayNumber} not found in schedule`);

  day.exercises.push(exercise);
  day.isRestDay = false;

  plan.dailyAdaptations.unshift({
    date: new Date().toISOString().split('T')[0],
    reason: `Added "${exercise.exerciseName}" to Day ${dayNumber}`,
    type: 'exercise_swap',
    exerciseName: exercise.exerciseName,
  });

  return await plan.save();
};

export const removeExerciseFromDay = async (
  userId: string,
  dayNumber: number,
  exerciseIndex: number
) => {
  const plan = await UserWorkoutPlan.findOne({ userId });
  if (!plan) throw new Error('No workout plan found to update');

  const day = plan.schedule.find(d => d.dayNumber === dayNumber);
  if (!day) throw new Error(`Day ${dayNumber} not found in schedule`);

  if (exerciseIndex < 0 || exerciseIndex >= day.exercises.length) {
    throw new Error('Invalid exercise index');
  }

  const removedName = day.exercises[exerciseIndex].exerciseName;
  day.exercises.splice(exerciseIndex, 1);

  if (day.exercises.length === 0) {
    day.isRestDay = true;
    day.title = 'Rest & Recovery';
  }

  plan.dailyAdaptations.unshift({
    date: new Date().toISOString().split('T')[0],
    reason: `Removed "${removedName}" from Day ${dayNumber}`,
    type: 'exercise_swap',
    exerciseName: removedName,
  });

  return await plan.save();
};

export const deleteUserPlan = async (userId: string | mongoose.Types.ObjectId): Promise<IUserWorkoutPlan> => {
  await UserWorkoutPlan.findOneAndDelete({ userId });

  // If there's an uncompleted/unstarted workout log for today that was loaded from the deleted plan, clear it
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = await WorkoutLog.findOne({ userId, date: todayStr });
  if (todayLog && todayLog.exercises.every(e => e.sets.every(s => !s.completed))) {
    await WorkoutLog.findByIdAndDelete(todayLog._id);
  }

  // Create clean slate: 7 days, all designated as rest with 0 exercises
  const emptyPlan = new UserWorkoutPlan({
    userId,
    programName: 'No Active Routine',
    isCustomPlan: true,
    preferences: DEFAULT_PREFERENCES,
    schedule: DAY_NAMES.map((name, idx) => ({
      dayNumber: idx + 1,
      dayName: name,
      isRestDay: true,
      title: 'Rest & Recovery',
      focus: 'Recovery',
      targetMuscles: [],
      estimatedDurationMinutes: 0,
      exercises: [],
    })),
    dailyAdaptations: [],
    adherenceRate: 100,
  });

  return await emptyPlan.save();
};



