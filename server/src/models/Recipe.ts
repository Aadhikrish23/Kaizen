import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipeIngredient {
  foodId?: mongoose.Types.ObjectId;
  name: string;
  servingSize: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IRecipe extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  ingredients: IRecipeIngredient[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: Date;
  updatedAt: Date;
}

const RecipeIngredientSchema = new Schema({
  foodId: { type: Schema.Types.ObjectId, ref: 'FoodItem' },
  name: { type: String, required: true },
  servingSize: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.1 },
  calories: { type: Number, required: true, min: 0 },
  protein: { type: Number, required: true, min: 0 },
  carbs: { type: Number, required: true, min: 0 },
  fat: { type: Number, required: true, min: 0 }
});

const RecipeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ingredients: [RecipeIngredientSchema],
    totalCalories: { type: Number, required: true, min: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model<IRecipe>('Recipe', RecipeSchema);
