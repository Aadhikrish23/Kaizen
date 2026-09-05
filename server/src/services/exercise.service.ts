import Exercise from '../models/Exercise';

export const getExercises = async (userId: string, muscle?: string) => {
  const filter: any = muscle ? { targetMuscle: String(muscle), userId } : { userId };
  return await Exercise.find(filter).sort({ name: 1 });
};

export const createExercise = async (data: any) => {
  const exercise = new Exercise({
    name: data.name,
    userId: data.userId,
    targetMuscle: data.targetMuscle,
    equipment: data.equipment || 'dumbbell',
    secondaryMuscles: data.secondaryMuscles || [],
    instructions: data.instructions
  });
  return await exercise.save();
};

export const deleteExercise = async (id: string, userId: string) => {
  return await Exercise.findOneAndDelete({ _id: id, userId });
};
