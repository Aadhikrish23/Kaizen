import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProgress extends Document {
  userId: mongoose.Types.ObjectId;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD in the user's timezone
  achievements: Array<{ key: string; unlockedAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastActiveDate: { type: String, default: null },
    achievements: [{ _id: false, key: { type: String, required: true }, unlockedAt: { type: Date, required: true } }],
  },
  { timestamps: true }
);

export default mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
