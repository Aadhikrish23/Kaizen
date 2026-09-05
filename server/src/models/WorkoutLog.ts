import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  completed: boolean;
}

export interface IWorkoutExercise {
  exerciseId?: string;
  exerciseName: string;
  targetMuscle: string;
  sets: IWorkoutSet[];
}

export interface IWorkoutLog extends Document {
  date: string; // format "YYYY-MM-DD"
  splitName: string; // e.g. "Push Day - Chest & Triceps"
  muscleGroups: string[];
  exercises: IWorkoutExercise[];
  durationMinutes?: number;
  notes?: string;
  totalVolumeKg: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutSetSchema = new Schema({
  setNumber: { type: Number, required: true },
  weightKg: { type: Number, required: true, min: 0 },
  reps: { type: Number, required: true, min: 0 },
  rpe: { type: Number, min: 1, max: 10 },
  completed: { type: Boolean, default: true }
}, { _id: false });

const WorkoutExerciseSchema = new Schema({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise' },
  exerciseName: { type: String, required: true },
  targetMuscle: { type: String, required: true },
  sets: [WorkoutSetSchema]
}, { _id: false });

const WorkoutLogSchema: Schema = new Schema({
  date: { type: String, required: true, index: true },
  splitName: { type: String, required: true, default: 'Custom Training' },
  muscleGroups: [{ type: String }],
  exercises: [WorkoutExerciseSchema],
  durationMinutes: { type: Number, min: 0 },
  notes: { type: String, trim: true },
  totalVolumeKg: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Auto-calculate volume before saving
WorkoutLogSchema.pre('save', function(next) {
  const doc = this as unknown as IWorkoutLog;
  let volume = 0;
  if (doc.exercises && Array.isArray(doc.exercises)) {
    for (const ex of doc.exercises) {
      if (ex.sets && Array.isArray(ex.sets)) {
        for (const s of ex.sets) {
          if (s.completed) {
            volume += (s.weightKg * s.reps);
          }
        }
      }
    }
  }
  doc.totalVolumeKg = volume;
  next();
});

export default mongoose.model<IWorkoutLog>('WorkoutLog', WorkoutLogSchema);
