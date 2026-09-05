import mongoose, { Schema, Document } from 'mongoose';

export interface IRoutineExercise {
  exerciseId?: mongoose.Types.ObjectId;
  exerciseName: string;
  targetMuscle: string;
  sets: number; // Target number of sets
  targetReps: string; // e.g., "8-12"
}

export interface IWorkoutRoutine extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  exercises: IRoutineExercise[];
  createdAt: Date;
  updatedAt: Date;
}

const RoutineExerciseSchema = new Schema({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise' },
  exerciseName: { type: String, required: true },
  targetMuscle: { type: String, required: true },
  sets: { type: Number, required: true, min: 1 },
  targetReps: { type: String, required: true }
});

const WorkoutRoutineSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    exercises: [RoutineExerciseSchema]
  },
  { timestamps: true }
);

export default mongoose.model<IWorkoutRoutine>('WorkoutRoutine', WorkoutRoutineSchema);
