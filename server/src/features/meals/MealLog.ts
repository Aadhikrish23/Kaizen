import { clientRequestIdIndex } from '../../utils/idempotency';
import mongoose, { Schema, Document } from 'mongoose';

export interface IMealLog extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;   // e.g. "12:45 PM"
  date: string;   // format "YYYY-MM-DD"
  clientRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MealLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  calories: { type: Number, required: true, min: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  mealType: { 
    type: String, 
    required: true, 
    enum: ['breakfast', 'lunch', 'dinner', 'snack'] 
  },
  time: { type: String, required: true },
  date: { type: String, required: true, index: true },
  clientRequestId: { type: String }, // idempotency key for offline replays (see utils/idempotency.ts)
}, {
  timestamps: true
});


MealLogSchema.index(...clientRequestIdIndex as unknown as [any, any]);

export default mongoose.model<IMealLog>('MealLog', MealLogSchema);
