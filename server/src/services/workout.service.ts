import WorkoutLog from '../models/WorkoutLog';

const DEFAULT_SPLITS = [
  { dayIndex: 1, splitName: 'Push Day', muscles: ['chest', 'shoulders', 'triceps'] },
  { dayIndex: 2, splitName: 'Pull Day', muscles: ['back', 'biceps', 'rear delts'] },
  { dayIndex: 3, splitName: 'Legs & Core', muscles: ['quads', 'hamstrings', 'calves', 'abs'] },
  { dayIndex: 4, splitName: 'Upper Focus & Arms', muscles: ['arms', 'chest', 'back'] },
  { dayIndex: 5, splitName: 'Push & Core', muscles: ['chest', 'shoulders', 'core'] },
  { dayIndex: 6, splitName: 'Pull & Legs', muscles: ['back', 'legs'] },
  { dayIndex: 0, splitName: 'Active Recovery / Rest', muscles: [] } // Sunday
];

export const getSchedule = () => {
  const today = new Date();
  const todayDay = today.getDay(); // 0-6
  const tomorrowDay = (todayDay + 1) % 7;

  const todaySplit = DEFAULT_SPLITS.find(s => s.dayIndex === todayDay) || DEFAULT_SPLITS[0];
  const tomorrowSplit = DEFAULT_SPLITS.find(s => s.dayIndex === tomorrowDay) || DEFAULT_SPLITS[1];

  return {
    today: {
      splitName: todaySplit.splitName,
      targetMuscles: todaySplit.muscles,
      status: todaySplit.muscles.length > 0 ? 'active' : 'rest'
    },
    tomorrow: {
      splitName: tomorrowSplit.splitName,
      targetMuscles: tomorrowSplit.muscles,
      status: tomorrowSplit.muscles.length > 0 ? 'upcoming' : 'rest'
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
  let workout = await WorkoutLog.findOne({ date: String(data.date), userId: data.userId });
  if (workout) {
    workout.splitName = data.splitName;
    workout.muscleGroups = data.muscleGroups || workout.muscleGroups;
    workout.exercises = data.exercises;
    workout.durationMinutes = data.durationMinutes;
    workout.notes = data.notes;
    return await workout.save();
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
    return await workout.save();
  }
};

export const deleteWorkout = async (id: string, userId: string) => {
  return await WorkoutLog.findOneAndDelete({ _id: id, userId });
};
