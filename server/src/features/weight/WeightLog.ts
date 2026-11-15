import { clientRequestIdIndex } from '../../utils/idempotency';
import mongoose, { Schema, Document } from 'mongoose';

export interface IWeightLog extends Document {
  userId: mongoose.Types.ObjectId;
  weight: number; // in kg
  date: string;   // format "YYYY-MM-DD"
  clientRequestId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WeightLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weight: { type: Number, required: true, min: 0.1 },
  date: { type: String, required: true },
  clientRequestId: { type: String }, // idempotency key for offline replays (see utils/idempotency.ts)
  notes: { type: String, trim: true }
}, {
  timestamps: true
});

WeightLogSchema.index({ userId: 1, date: 1 }, { unique: true });


WeightLogSchema.index(...clientRequestIdIndex as unknown as [any, any]);

export default mongoose.model<IWeightLog>('WeightLog', WeightLogSchema);
