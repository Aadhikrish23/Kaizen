import mongoose, { Schema, Document } from 'mongoose';

export interface IFoodItem extends Document {
  name: string;
  brand?: string;
  servingSize: string; // e.g., "100g", "1 medium", "1 scoop"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom: boolean;
  userId?: mongoose.Types.ObjectId; // null if global
  createdAt: Date;
  updatedAt: Date;
}

const FoodItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    brand: { type: String, trim: true },
    servingSize: { type: String, required: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    isCustom: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true }
  },
  { timestamps: true }
);

export default mongoose.model<IFoodItem>('FoodItem', FoodItemSchema);
