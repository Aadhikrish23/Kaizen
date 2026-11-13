import mongoose, { Schema, Document } from 'mongoose';

export interface IMeasurementLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  weight?: number; // Optional sync with WeightLog
  bodyFatPercentage?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armsCm?: number;
  legsCm?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MeasurementLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    weight: { type: Number, min: 0 },
    bodyFatPercentage: { type: Number, min: 0, max: 100 },
    chestCm: { type: Number, min: 0 },
    waistCm: { type: Number, min: 0 },
    hipsCm: { type: Number, min: 0 },
    armsCm: { type: Number, min: 0 },
    legsCm: { type: Number, min: 0 }
  },
  { timestamps: true }
);

// Ensure one measurement log per user per date
MeasurementLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IMeasurementLog>('MeasurementLog', MeasurementLogSchema);
