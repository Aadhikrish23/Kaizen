import mongoose, { Schema, Document } from 'mongoose';

export interface IWeightLog extends Document {
  userId: mongoose.Types.ObjectId;
  weight: number; // in kg
  date: string;   // format "YYYY-MM-DD"
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WeightLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  weight: { type: Number, required: true, min: 0.1 },
  date: { type: String, required: true, unique: true, index: true },
  notes: { type: String, trim: true }
}, {
  timestamps: true
});

export default mongoose.model<IWeightLog>('WeightLog', WeightLogSchema);
