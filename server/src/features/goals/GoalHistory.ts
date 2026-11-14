import mongoose, { Schema, Document } from 'mongoose';

export interface IGoalHistory extends Document {
  userId: mongoose.Types.ObjectId;
  goal?: string | null;
  targetWeightKg?: number | null;
  targetDate?: string | null; // YYYY-MM-DD
  startWeightKg?: number | null; // body weight when this goal state was set (if known)
  changed: string[]; // which of goal / targetWeightKg / targetDate changed
  createdAt: Date;
}

const GoalHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    goal: { type: String, default: null },
    targetWeightKg: { type: Number, default: null },
    targetDate: { type: String, default: null },
    startWeightKg: { type: Number, default: null },
    changed: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GoalHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IGoalHistory>('GoalHistory', GoalHistorySchema);
