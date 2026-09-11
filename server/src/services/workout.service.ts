import WorkoutLog from '../models/WorkoutLog';
import UserWorkoutPlan from '../models/UserWorkoutPlan';
import * as inventoryService from './inventory.service';

const DEFAULT_SPLITS = [
  { dayIndex: 1, splitName: 'Push Day', muscles: ['chest', 'shoulders', 'triceps'] },
  { dayIndex: 2, splitName: 'Pull Day', muscles: ['back', 'biceps', 'rear delts'] },
  { dayIndex: 3, splitName: 'Legs & Core', muscles: ['quads', 'hamstrings', 'calves', 'abs'] },
  { dayIndex: 4, splitName: 'Upper Focus & Arms', muscles: ['arms', 'chest', 'back'] },
  { dayIndex: 5, splitName: 'Push & Core', muscles: ['chest', 'shoulders', 'core'] },
  { dayIndex: 6, splitName: 'Pull & Legs', muscles: ['back', 'legs'] },
  { dayIndex: 0, splitName: 'Active Recovery / Rest', muscles: [] } // Sunday
];

export const getSchedule = async (userId?: string) => {
  const today = new Date();
  const jsDay = today.getDay(); // 0-6
  const tomorrowDay = (todayDay: number) => (todayDay + 1) % 7;

  // If user has a workout plan configured, align to their plan
  if (userId) {
    try {
      const plan = await UserWorkoutPlan.findOne({ userId });
      if (plan && plan.schedule && plan.schedule.length > 0) {
        const currentDayNumber = jsDay === 0 ? 7 : jsDay;
        const nextDayNumber = currentDayNumber === 7 ? 1 : currentDayNumber + 1;

        const todayDay = plan.schedule.find((d: any) => d.dayNumber === currentDayNumber);
        const tomorrowDay = plan.schedule.find((d: any) => d.dayNumber === nextDayNumber);

        if (todayDay && tomorrowDay) {
          const todayHasExercises = !todayDay.isRestDay && todayDay.exercises && todayDay.exercises.length > 0;
          const tomorrowHasExercises = !tomorrowDay.isRestDay && tomorrowDay.exercises && tomorrowDay.exercises.length > 0;

          return {
            today: {
              dayNumber: todayDay.dayNumber,
              splitName: todayHasExercises ? todayDay.title : 'Rest & Recovery',
              targetMuscles: todayHasExercises ? (todayDay.targetMuscles || []) : [],
              status: todayHasExercises ? 'active' : 'rest',
              isRestDay: !todayHasExercises,
              exercisesCount: todayDay.exercises?.length || 0,
            },
            tomorrow: {
              dayNumber: tomorrowDay.dayNumber,
              splitName: tomorrowHasExercises ? tomorrowDay.title : 'Rest & Recovery',
              targetMuscles: tomorrowHasExercises ? (tomorrowDay.targetMuscles || []) : [],
              status: tomorrowHasExercises ? 'upcoming' : 'rest',
              isRestDay: !tomorrowHasExercises,
              exercisesCount: tomorrowDay.exercises?.length || 0,
            }
          };
        }
      }
    } catch (e) {
      // Fallback
    }

    return {
      today: {
        dayNumber: jsDay === 0 ? 7 : jsDay,
        splitName: 'Rest & Recovery',
        targetMuscles: [],
        status: 'rest',
        isRestDay: true,
        exercisesCount: 0,
      },
      tomorrow: {
        dayNumber: tomorrowDay(jsDay) === 0 ? 7 : tomorrowDay(jsDay),
        splitName: 'Rest & Recovery',
        targetMuscles: [],
        status: 'rest',
        isRestDay: true,
        exercisesCount: 0,
      }
    };
  }

  const todaySplit = DEFAULT_SPLITS.find(s => s.dayIndex === jsDay) || DEFAULT_SPLITS[0];
  const tomorrowSplit = DEFAULT_SPLITS.find(s => s.dayIndex === tomorrowDay(jsDay)) || DEFAULT_SPLITS[1];

  return {
    today: {
      dayNumber: jsDay === 0 ? 7 : jsDay,
      splitName: todaySplit.splitName,
      targetMuscles: todaySplit.muscles,
      status: todaySplit.muscles.length > 0 ? 'active' : 'rest',
      isRestDay: todaySplit.muscles.length === 0,
      exercisesCount: 0,
    },
    tomorrow: {
      dayNumber: tomorrowDay(jsDay) === 0 ? 7 : tomorrowDay(jsDay),
      splitName: tomorrowSplit.splitName,
      targetMuscles: tomorrowSplit.muscles,
      status: tomorrowSplit.muscles.length > 0 ? 'upcoming' : 'rest',
      isRestDay: tomorrowSplit.muscles.length === 0,
      exercisesCount: 0,
    }
  };
};

export const getWorkouts = async (userId: string, date?: string) => {
  if (!date) {
    return await WorkoutLog.find({ userId }).sort({ date: -1 }).limit(10);
  }
  return await WorkoutLog.findOne({ date: String(date), userId });
};

export const createOrUpdateWorkout = async (data: any) => {
  let savedWorkout;
  let workout = await WorkoutLog.findOne({ date: String(data.date), userId: data.userId });
  if (workout) {
    workout.splitName = data.splitName;
    workout.muscleGroups = data.muscleGroups || workout.muscleGroups;
    workout.exercises = data.exercises;
    workout.durationMinutes = data.durationMinutes;
    workout.notes = data.notes;
    savedWorkout = await workout.save();
  } else {
    workout = new WorkoutLog({
      date: data.date,
      userId: data.userId,
      splitName: data.splitName,
      muscleGroups: data.muscleGroups || [],
      exercises: data.exercises,
      durationMinutes: data.durationMinutes,
      notes: data.notes
    });
    savedWorkout = await workout.save();
  }

  // Synchronize completed exercise weights to user inventory
  if (Array.isArray(data.exercises) && data.userId) {
    for (const ex of data.exercises) {
      if (Array.isArray(ex.sets) && ex.sets.length > 0) {
        const completedSetsWithWeight = ex.sets.filter((s: any) => s.completed && typeof s.weightKg === 'number' && s.weightKg > 0);
        if (completedSetsWithWeight.length > 0) {
          const bestSet = completedSetsWithWeight.reduce((prev: any, curr: any) => (curr.weightKg > prev.weightKg ? curr : prev), completedSetsWithWeight[0]);
          inventoryService.recordWorkingWeight(data.userId, {
            exerciseName: ex.exerciseName || ex.name || 'Exercise',
            exerciseId: ex.exerciseId,
            currentWeightKg: bestSet.weightKg,
            targetReps: bestSet.reps || 10,
            date: data.date,
            rpe: bestSet.rpe
          }).catch(err => console.error('[InventorySync] Error updating working weight:', err));
        }
      }
    }
  }

  return savedWorkout;
};

export const deleteWorkout = async (id: string, userId: string) => {
  return await WorkoutLog.findOneAndDelete({ _id: id, userId });
};
