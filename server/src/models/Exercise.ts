import mongoose, { Schema, Document } from 'mongoose';

export interface IExercise extends Document {
  userId?: mongoose.Types.ObjectId;
  name: string;
  targetMuscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core';
  secondaryMuscles?: string[];
  equipment: 'dumbbell' | 'barbell' | 'bodyweight' | 'band' | 'cable' | 'machine' | 'other';
  instructions?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  formTips?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  name: { type: String, required: true, trim: true, index: true },
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
  instructions: { type: String, trim: true },
  gifUrl: { type: String },
  imageUrl: { type: String },
  videoUrl: { type: String },
  formTips: [{ type: String }],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' }
}, {
  timestamps: true
});

ExerciseSchema.index({ name: 1, userId: 1 });

export default mongoose.model<IExercise>('Exercise', ExerciseSchema);
