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
  imageUrl?: string;
  externalId?: string;
  // What calories/protein/carbs/fat refer to; absent on legacy rows (see resolveBasis)
  basis?: 'per_100g' | 'per_serving';
  servingQty?: number;  // numeric serving size when known (g or ml)
  servingUnit?: 'g' | 'ml';
  source?: 'local' | 'spoonacular' | 'openfoodfacts';
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
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    imageUrl: { type: String },
    externalId: { type: String },
    basis: { type: String, enum: ['per_100g', 'per_serving'] },
    servingQty: { type: Number, min: 0 },
    servingUnit: { type: String, enum: ['g', 'ml'] },
    source: { type: String, enum: ['local', 'spoonacular', 'openfoodfacts'], default: 'local' }
  },
  { timestamps: true }
);

export default mongoose.model<IFoodItem>('FoodItem', FoodItemSchema);
