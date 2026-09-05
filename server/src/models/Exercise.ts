import mongoose, { Schema, Document } from 'mongoose';

export interface IExercise extends Document {
  userId?: mongoose.Types.ObjectId;
  name: string;
  targetMuscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core';
  secondaryMuscles?: string[];
  equipment: 'dumbbell' | 'barbell' | 'bodyweight' | 'band' | 'cable' | 'machine' | 'other';
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, required: true, trim: true, unique: true },
  targetMuscle: { 
    type: String, 
    required: true, 
    enum: ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core'] 
  },
  secondaryMuscles: [{ type: String }],
  equipment: { 
    type: String, 
    required: true, 
    default: 'dumbbell',
    enum: ['dumbbell', 'barbell', 'bodyweight', 'band', 'cable', 'machine', 'other'] 
  },
  instructions: { type: String, trim: true }
}, {
  timestamps: true
});

export default mongoose.model<IExercise>('Exercise', ExerciseSchema);
