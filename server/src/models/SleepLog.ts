import mongoose, { Schema, Document } from 'mongoose';

export interface ISleepLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // format "YYYY-MM-DD"
  bedtime: string; // e.g. "23:00"
  wakeTime: string; // e.g. "07:00"
  durationMinutes: number; // e.g. 480
  quality: number; // 1 to 5
  cyclesCount: number; // durationMinutes / 90 (e.g. 5.3 or discrete 5)
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
  awakeMinutes: number;
  recoveryScore: number; // 0 to 100
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SleepLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    bedtime: { type: String, required: true },
    wakeTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true, min: 0 },
    quality: { type: Number, required: true, min: 1, max: 5, default: 3 },
    cyclesCount: { type: Number, required: true, default: 0 },
    deepSleepMinutes: { type: Number, default: 0 },
    remSleepMinutes: { type: Number, default: 0 },
    lightSleepMinutes: { type: Number, default: 0 },
    awakeMinutes: { type: Number, default: 0 },
    recoveryScore: { type: Number, default: 70, min: 0, max: 100 },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

SleepLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<ISleepLog>('SleepLog', SleepLogSchema);
