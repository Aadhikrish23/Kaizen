import { isValidTimezone } from '../../utils/dates';
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean; // false = deactivated by an admin: cannot log in, refresh or use existing tokens
  // Profile
  dob?: Date;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  currentWeightKg?: number;
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal?: 'lose_weight' | 'gain_weight' | 'maintain_weight';
  targetWeightKg?: number;
  targetDate?: Date;
  // Targets (computed or manually set)
  calorieDailyTarget?: number;
  proteinDailyTargetG?: number;
  waterDailyTargetMl?: number;
  isPrivateProfile: boolean;
  // Preferences
  units?: 'metric' | 'imperial';
  timezone?: string;
  // Onboarding
  onboardingComplete?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Legacy documents have no value and count as active (see isAccountActive)
    isActive: { type: Boolean, default: true },
    // Profile fields
    dob: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    heightCm: Number,
    currentWeightKg: Number,
    activityLevel: {
      type: String,
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']
    },
    goal: { type: String, enum: ['lose_weight', 'gain_weight', 'maintain_weight'] },
    targetWeightKg: Number,
    targetDate: Date,
    // Targets
    calorieDailyTarget: { type: Number, default: 2000 },
    proteinDailyTargetG: { type: Number, default: 150 },
    waterDailyTargetMl: { type: Number, default: 2500 },
    // Privacy & Admin
    isPrivateProfile: { type: Boolean, default: true },

    // XP, level and streaks live in UserProgress (features/gamification), not on the user
    // Preferences
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    // IANA timezone; defines the user's calendar day (see docs/timezone.md)
    timezone: {
      type: String,
      default: 'UTC',
      validate: { validator: (v: string) => isValidTimezone(v), message: 'Invalid IANA timezone' }
    },
    // Onboarding
    onboardingComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
