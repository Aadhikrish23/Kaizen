import mongoose, { Schema, Document } from 'mongoose';

export interface IPlannedExercise {
  exerciseId?: string;
  exerciseName: string;
  targetMuscle: string;
  equipment: string;
  targetSets: number;
  targetReps: number;
  suggestedWeightKg: number;
  restSeconds: number;
  videoUrl?: string;
  formTips?: string[];
  notes?: string;
  movementPattern?: string;
  repUnit?: 'reps' | 'seconds';
  minReps?: number;
  maxReps?: number;
  rpeTarget?: number;
  isConditioning?: boolean;
}

export interface IPlannedDay {
  dayNumber: number;
  dayName: string;
  isRestDay: boolean;
  title: string;
  focus: string;
  targetMuscles: string[];
  estimatedDurationMinutes: number;
  exercises: IPlannedExercise[];
}

export interface IDailyAdaptation {
  date: string;
  reason: string;
  type: 'weight_increase' | 'volume_adjustment' | 'rest_shift' | 'deload' | 'streak_milestone' | 'exercise_swap';
  exerciseName?: string;
  oldValue?: number | string;
  newValue?: number | string;
}

export interface IPlannerPreferences {
  daysPerWeek: number;
  sessionDurationMinutes: number;
  splitStyle: 'full_body' | 'upper_lower' | 'ppl' | 'home_dumbbell';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  targetFocus: 'hypertrophy' | 'strength' | 'fat_loss' | 'general_fitness';
  preferredDays?: string[];
}

export interface IUserWorkoutPlan extends Document {
  userId: mongoose.Types.ObjectId;
  programName?: string;
  isCustomPlan?: boolean;
  preferences: IPlannerPreferences;
  schedule: IPlannedDay[];
  dailyAdaptations: IDailyAdaptation[];
  adherenceRate: number;
  lastEvaluatedDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlannedExerciseSchema = new Schema(
  {
    exerciseId: { type: String },
    exerciseName: { type: String, required: true },
    targetMuscle: { type: String, required: true },
    equipment: { type: String, required: true },
    targetSets: { type: Number, required: true, default: 3 },
    targetReps: { type: Number, required: true, default: 10 },
    suggestedWeightKg: { type: Number, default: 10 },
    restSeconds: { type: Number, default: 60 },
    videoUrl: { type: String },
    formTips: [{ type: String }],
    notes: { type: String },
    movementPattern: { type: String },
    repUnit: { type: String, enum: ['reps', 'seconds'], default: 'reps' },
    minReps: { type: Number },
    maxReps: { type: Number },
    rpeTarget: { type: Number },
    isConditioning: { type: Boolean, default: false },
  },
  { _id: false }
);


const PlannedDaySchema = new Schema(
  {
    dayNumber: { type: Number, required: true },
    dayName: { type: String, required: true },
    isRestDay: { type: Boolean, default: false },
    title: { type: String, required: true },
    focus: { type: String, required: true },
    targetMuscles: [{ type: String }],
    estimatedDurationMinutes: { type: Number, default: 45 },
    exercises: [PlannedExerciseSchema],
  },
  { _id: false }
);

const DailyAdaptationSchema = new Schema(
  {
    date: { type: String, required: true },
    reason: { type: String, required: true },
    type: {
      type: String,
      enum: ['weight_increase', 'volume_adjustment', 'rest_shift', 'deload', 'streak_milestone', 'exercise_swap'],
      required: true,
    },
    exerciseName: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const PlannerPreferencesSchema = new Schema(
  {
    daysPerWeek: { type: Number, required: true, default: 3 },
    sessionDurationMinutes: { type: Number, required: true, default: 45 },
    splitStyle: {
      type: String,
      enum: ['full_body', 'upper_lower', 'ppl', 'home_dumbbell'],
      default: 'full_body',
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    targetFocus: {
      type: String,
      enum: ['hypertrophy', 'strength', 'fat_loss', 'general_fitness'],
      default: 'general_fitness',
    },
    preferredDays: [{ type: String }],
  },
  { _id: false }
);

const UserWorkoutPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    programName: { type: String, default: 'Custom Split' },
    isCustomPlan: { type: Boolean, default: false },
    preferences: { type: PlannerPreferencesSchema, required: true },
    schedule: [PlannedDaySchema],
    dailyAdaptations: [DailyAdaptationSchema],
    adherenceRate: { type: Number, default: 100 },
    lastEvaluatedDate: { type: String },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserWorkoutPlan>('UserWorkoutPlan', UserWorkoutPlanSchema);
