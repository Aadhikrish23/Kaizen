import mongoose, { Schema, Document } from 'mongoose';

export interface IWaterLog extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number; // in ml
  time: string;   // e.g. "08:30 AM"
  date: string;   // format "YYYY-MM-DD"
  createdAt: Date;
  updatedAt: Date;
}

const WaterLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1 },
  time: { type: String, required: true },
  date: { type: String, required: true, index: true }
}, {
  timestamps: true
});

export default mongoose.model<IWaterLog>('WaterLog', WaterLogSchema);
