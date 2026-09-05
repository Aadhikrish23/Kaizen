import mongoose, { Schema, Document } from 'mongoose';

export interface IMealLog extends Document {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;   // e.g. "12:45 PM"
  date: string;   // format "YYYY-MM-DD"
  createdAt: Date;
  updatedAt: Date;
}

const MealLogSchema: Schema = new Schema({
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
  date: { type: String, required: true, index: true }
}, {
  timestamps: true
});

export default mongoose.model<IMealLog>('MealLog', MealLogSchema);
