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
import { COMPREHENSIVE_EXERCISE_CATALOG } from './planner/exerciseCatalog';
import { ExerciseCatalogItem } from './planner/movementModel';
import { buildEquipmentProfile, isExerciseCompatibleWithProfile } from './planner/inventoryEvaluator';
import { generateBalancedWeeklyPlan } from './planner/weeklyBalanceEngine';
import { evaluateDoubleProgression, ExercisePerformanceEvaluation } from './planner/progressiveOverloadEngine';

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
 * Synchronize canonical exercise catalog into MongoDB Exercise collection
 */
export const syncCatalogWithDb = async (): Promise<void> => {
  try {
    for (const item of COMPREHENSIVE_EXERCISE_CATALOG) {
      await Exercise.findOneAndUpdate(
        { name: item.name, userId: null },
        {
          $set: {
            name: item.name,
            targetMuscle: item.targetMuscle,
            secondaryMuscles: item.secondaryMuscles,
            equipment: item.equipment,
            difficulty: item.difficulty,
            instructions: item.instructions,
            videoUrl: item.videoUrl,
            formTips: item.formTips,
            movementPattern: item.movementPattern,
            movementSubtype: item.movementSubtype,
            mechanic: item.mechanic,
            laterality: item.laterality,
            axialLoading: item.axialLoading,
            stabilityDemand: item.stabilityDemand,
            fatigueCost: item.fatigueCost,
            recoveryDemandHours: item.recoveryDemandHours,
            isTimeBased: item.isTimeBased,
            defaultTimeSeconds: item.defaultTimeSeconds,
            benchRequired: item.benchRequired,
            pullupBarRequired: item.pullupBarRequired,
            pushupHandlesCompatible: item.pushupHandlesCompatible,
            progressionMethod: item.progressionMethod,
            regressions: item.regressions,
            progressions: item.progressions,
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error('[Planner Service] Error syncing catalog to DB:', err);
  }
};

/**
 * Get or create initial workout plan for the user
 */
export const getUserPlan = async (userId: string | mongoose.Types.ObjectId): Promise<IUserWorkoutPlan> => {
  const existing = await UserWorkoutPlan.findOne({ userId });
  if (existing) {
    return existing;
  }
  try {
    return await configurePlan(userId, DEFAULT_PREFERENCES);
  } catch (err: any) {
    if (err.code === 11000) {
      const plan = await UserWorkoutPlan.findOne({ userId });
      if (plan) return plan;
    }
    throw err;
  }
};

/**
 * Strict equipment and biomechanics compatibility evaluator.
 * Evaluates exercise requirements against user's physical inventory arsenal.
 */
export const isExerciseCompatibleWithInventory = (
  ex: { name: string; equipment: string; benchRequired?: boolean; pullupBarRequired?: boolean },
  equipmentList: any[]
): boolean => {
  const profile = buildEquipmentProfile(equipmentList);

  // Look up in catalog for full metadata
  const catalogItem = COMPREHENSIVE_EXERCISE_CATALOG.find(
    c => c.name.toLowerCase() === ex.name.toLowerCase()
  );

  if (catalogItem) {
    return isExerciseCompatibleWithProfile(catalogItem, profile);
  }

  // Fallback heuristic evaluation
  const exItem: ExerciseCatalogItem = {
    name: ex.name,
    targetMuscle: 'chest',
    secondaryMuscles: [],
    equipment: ex.equipment as any,
    movementPattern: 'horizontal_push',
    movementSubtype: 'general',
    mechanic: 'compound',
    laterality: 'bilateral',
    axialLoading: 'none',
    stabilityDemand: 'moderate',
    fatigueCost: 2,
    recoveryDemandHours: 36,
    difficulty: 'beginner',
    defaultRepRange: { min: 8, max: 12 },
    defaultRestSeconds: 60,
    isTimeBased: false,
    progressionMethod: 'double_progression',
    benchRequired: ex.benchRequired || [
      'bench press', 'incline dumbbell press', 'decline barbell bench press',
      'dumbbell pullover', 'incline dumbbell curl', 'close-grip barbell bench press',
      'bench dips', 'barbell hip thrust', 'skull crusher', 'preacher curl'
    ].some(kw => ex.name.toLowerCase().includes(kw)),
    pullupBarRequired: ex.pullupBarRequired || ['pull-up', 'chin-up', 'hanging leg'].some(kw => ex.name.toLowerCase().includes(kw)),
    pushupHandlesCompatible: ex.name.toLowerCase().includes('deficit push-up'),
    instructions: '',
    formTips: [],
  };

  return isExerciseCompatibleWithProfile(exItem, profile);
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

  // Synchronize DB exercise items with rich catalog
  await syncCatalogWithDb();

  const userWeight = user?.currentWeightKg || 70;
  const knownWorkingWeights = (inventory?.workingWeights || []).map(w => ({
    exerciseName: w.exerciseName,
    currentWeightKg: w.currentWeightKg,
  }));

  // Generate holistic, biomechanically balanced weekly plan
  const { schedule, qualityScore, balanceMetrics } = generateBalancedWeeklyPlan(
    preferences,
    inventory?.equipment || [],
    userWeight,
    knownWorkingWeights
  );

  // Attach database exercise IDs where matches exist
  const dbExercises = await Exercise.find({ userId: null });
  const dbMap = new Map(dbExercises.map(e => [e.name.toLowerCase().trim(), e]));

  for (const day of schedule) {
    for (const planEx of day.exercises) {
      const match = dbMap.get(planEx.exerciseName.toLowerCase().trim());
      if (match) {
        planEx.exerciseId = (match._id as mongoose.Types.ObjectId).toString();
      }
    }
  }

  let plan = await UserWorkoutPlan.findOne({ userId });
  if (!plan) {
    try {
      plan = new UserWorkoutPlan({
        userId,
        preferences,
        schedule,
        dailyAdaptations: [
          {
            date: new Date().toISOString().split('T')[0],
            reason: `Generated ${preferences.splitStyle.replace('_', ' ').toUpperCase()} split (Quality Score: ${qualityScore.overallScore}/100). Balanced push/pull (${balanceMetrics.pushPullRatio}) and squat/hinge (${balanceMetrics.squatHingeRatio}). Strict inventory matched.`,
            type: 'streak_milestone',
            exerciseName: 'Program Initialized',
          },
        ],
        adherenceRate: 100,
        lastEvaluatedDate: new Date().toISOString().split('T')[0],
      });
      return await plan.save();
    } catch (err: any) {
      if (err.code === 11000) {
        plan = await UserWorkoutPlan.findOne({ userId });
      } else {
        throw err;
      }
    }
  }

  if (plan) {
    plan.preferences = preferences;
    plan.schedule = schedule;
    plan.isCustomPlan = false;
    plan.programName = `${preferences.splitStyle.replace('_', ' ').toUpperCase()} Balanced Split`;
    plan.dailyAdaptations.unshift({
      date: new Date().toISOString().split('T')[0],
      reason: `Program synthesized: Quality Score ${qualityScore.overallScore}/100. Push/Pull ratio: ${balanceMetrics.pushPullRatio}, Squat/Hinge ratio: ${balanceMetrics.squatHingeRatio}. ${qualityScore.strengths.slice(0, 2).join(' ')}`,
      type: 'volume_adjustment',
      exerciseName: 'Preferences Updated',
    });
    return await plan.save();
  }

  return plan!;
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

  const inventory = await getUserInventory(userId);
  const profile = buildEquipmentProfile(inventory?.equipment || []);

  // Find recent workout logs (today or most recent)
  const recentLogs = await WorkoutLog.find({ userId }).sort({ date: -1 }).limit(5);
  if (!recentLogs || recentLogs.length === 0) {
    plan.lastEvaluatedDate = evalDate;
    return await plan.save();
  }

  const latestLog = recentLogs[0];
  const adaptations: IDailyAdaptation[] = [];

  for (const loggedEx of latestLog.exercises) {
    // Find matching planned exercise in schedule
    let matchedPlanEx: IPlannedExercise | undefined;
    for (const day of plan.schedule) {
      const found = day.exercises.find(e => e.exerciseName.trim().toLowerCase() === loggedEx.exerciseName.trim().toLowerCase());
      if (found) {
        matchedPlanEx = found;
        break;
      }
    }

    if (!matchedPlanEx) continue;

    const catalogItem = COMPREHENSIVE_EXERCISE_CATALOG.find(
      c => c.name.toLowerCase() === loggedEx.exerciseName.toLowerCase()
    );

    const minReps = catalogItem?.defaultRepRange.min || Math.max(matchedPlanEx.targetReps - 2, 6);
    const maxReps = catalogItem?.defaultRepRange.max || Math.min(matchedPlanEx.targetReps + 2, 12);

    const evalData: ExercisePerformanceEvaluation = {
      exerciseName: loggedEx.exerciseName,
      equipment: matchedPlanEx.equipment,
      currentPrescribedWeightKg: matchedPlanEx.suggestedWeightKg || 10,
      currentPrescribedReps: matchedPlanEx.targetReps || 10,
      minReps,
      maxReps,
      completedSets: loggedEx.sets.map(s => ({
        reps: s.reps,
        weightKg: s.weightKg,
        rpe: s.rpe,
        completed: s.completed,
      })),
    };

    const recommendation = evaluateDoubleProgression(evalData, profile);

    if (recommendation.type === 'weight_increase' || recommendation.type === 'volume_adjustment' || recommendation.type === 'deload') {
      // Update planned exercise across schedule
      for (const day of plan.schedule) {
        for (const ex of day.exercises) {
          if (ex.exerciseName.trim().toLowerCase() === loggedEx.exerciseName.trim().toLowerCase()) {
            ex.suggestedWeightKg = recommendation.newWeightKg;
            ex.targetReps = recommendation.newTargetReps;
          }
        }
      }

      // Record working weight into UserInventory
      if (recommendation.newWeightKg > 0) {
        await recordWorkingWeight(userId, {
          exerciseName: loggedEx.exerciseName,
          currentWeightKg: recommendation.newWeightKg,
          date: evalDate,
          rpe: 8,
        });
      }

      adaptations.push({
        date: evalDate,
        type: recommendation.type === 'weight_increase' ? 'weight_increase' : recommendation.type === 'deload' ? 'deload' : 'volume_adjustment',
        exerciseName: loggedEx.exerciseName,
        oldValue: `${matchedPlanEx.suggestedWeightKg} kg × ${matchedPlanEx.targetReps} reps`,
        newValue: `${recommendation.newWeightKg} kg × ${recommendation.newTargetReps} reps`,
        reason: recommendation.reason,
      });
    }
  }

  if (adaptations.length === 0) {
    adaptations.push({
      date: evalDate,
      type: 'volume_adjustment',
      reason: `Consistent session execution recorded for ${evalDate}. Training loads maintained within double progression window.`,
    });
  }

  plan.dailyAdaptations.unshift(...adaptations);
  if (plan.dailyAdaptations.length > 30) {
    plan.dailyAdaptations = plan.dailyAdaptations.slice(0, 30);
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

  const exercises = plannedDay.exercises.map(ex => {
    const sets = [];
    for (let i = 1; i <= ex.targetSets; i++) {
      sets.push({
        setNumber: i,
        weightKg: ex.suggestedWeightKg || 0,
        reps: ex.targetReps || 10,
        rpe: 7.5,
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

  const oldExName = day.exercises[exerciseIndex].exerciseName;
  const currentSets = day.exercises[exerciseIndex].targetSets || 3;
  const currentReps = newEx.isTimeBased ? (newEx.defaultTimeSeconds || 30) : (day.exercises[exerciseIndex].targetReps || 10);
  const currentRest = newEx.isTimeBased ? 45 : (day.exercises[exerciseIndex].restSeconds || 60);

  const loggedWw = inventory.workingWeights?.find(
    ww => ww.exerciseName.trim().toLowerCase() === newEx.name.trim().toLowerCase()
  );

  let suggestedWeight = 0;
  if (loggedWw && loggedWw.currentWeightKg > 0) {
    suggestedWeight = loggedWw.currentWeightKg;
  } else if (newEx.equipment === 'bodyweight') {
    suggestedWeight = 0;
  } else if (newEx.equipment === 'dumbbell') {
    suggestedWeight = 8;
  } else if (newEx.equipment === 'barbell') {
    suggestedWeight = 20;
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

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = await WorkoutLog.findOne({ userId, date: todayStr });
  if (todayLog && todayLog.exercises.every(e => e.sets.every(s => !s.completed))) {
    await WorkoutLog.findByIdAndDelete(todayLog._id);
  }

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
