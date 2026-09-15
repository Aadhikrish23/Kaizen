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
  movementPattern?: string;
  movementSubtype?: string;
  mechanic?: 'compound' | 'isolation';
  laterality?: 'bilateral' | 'unilateral';
  axialLoading?: string;
  stabilityDemand?: string;
  fatigueCost?: number;
  recoveryDemandHours?: number;
  isTimeBased?: boolean;
  defaultTimeSeconds?: number;
  benchRequired?: boolean;
  pullupBarRequired?: boolean;
  pushupHandlesCompatible?: boolean;
  progressionMethod?: string;
  regressions?: string[];
  progressions?: string[];
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
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
  movementPattern: { type: String },
  movementSubtype: { type: String },
  mechanic: { type: String, enum: ['compound', 'isolation'] },
  laterality: { type: String, enum: ['bilateral', 'unilateral'] },
  axialLoading: { type: String },
  stabilityDemand: { type: String },
  fatigueCost: { type: Number, default: 2 },
  recoveryDemandHours: { type: Number, default: 36 },
  isTimeBased: { type: Boolean, default: false },
  defaultTimeSeconds: { type: Number },
  benchRequired: { type: Boolean, default: false },
  pullupBarRequired: { type: Boolean, default: false },
  pushupHandlesCompatible: { type: Boolean, default: false },
  progressionMethod: { type: String },
  regressions: [{ type: String }],
  progressions: [{ type: String }]
}, {
  timestamps: true
});

ExerciseSchema.index({ name: 1, userId: 1 });

export default mongoose.model<IExercise>('Exercise', ExerciseSchema);

