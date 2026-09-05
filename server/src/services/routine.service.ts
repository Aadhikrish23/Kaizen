import mongoose from 'mongoose';
import WorkoutRoutine, { IWorkoutRoutine, IRoutineExercise } from '../models/WorkoutRoutine';

export const createRoutine = async (
  userId: string | mongoose.Types.ObjectId,
  name: string,
  description?: string,
  exercises: IRoutineExercise[] = []
): Promise<IWorkoutRoutine> => {
  const routine = new WorkoutRoutine({
    userId,
    name,
    description,
    exercises
  });
  return await routine.save();
};

export const getRoutinesByUser = async (userId: string | mongoose.Types.ObjectId): Promise<IWorkoutRoutine[]> => {
  return await WorkoutRoutine.find({ userId }).sort({ createdAt: -1 });
};

export const getRoutineById = async (
  id: string,
  userId: string | mongoose.Types.ObjectId
): Promise<IWorkoutRoutine | null> => {
  return await WorkoutRoutine.findOne({ _id: id, userId });
};

export const updateRoutine = async (
  id: string,
  userId: string | mongoose.Types.ObjectId,
  updateData: Partial<IWorkoutRoutine>
): Promise<IWorkoutRoutine | null> => {
  return await WorkoutRoutine.findOneAndUpdate(
    { _id: id, userId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

export const deleteRoutine = async (
  id: string,
  userId: string | mongoose.Types.ObjectId
): Promise<IWorkoutRoutine | null> => {
  return await WorkoutRoutine.findOneAndDelete({ _id: id, userId });
};
