import { clientRequestIdIndex } from '../../utils/idempotency';
import mongoose, { Schema, Document } from 'mongoose';

export interface IWaterLog extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number; // in ml
  time: string;   // e.g. "08:30 AM"
  date: string;   // format "YYYY-MM-DD"
  clientRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaterLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1 },
  time: { type: String, required: true },
  date: { type: String, required: true, index: true },
  clientRequestId: { type: String }, // idempotency key for offline replays (see utils/idempotency.ts)
}, {
  timestamps: true
});


WaterLogSchema.index(...clientRequestIdIndex as unknown as [any, any]);

export default mongoose.model<IWaterLog>('WaterLog', WaterLogSchema);
