import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FoodItem from './models/FoodItem';

dotenv.config();

const globalFoods = [
  { name: 'Chicken Breast (Cooked)', servingSize: '100g', calories: 165, protein: 31, carbs: 0, fat: 3.6, isCustom: false },
  { name: 'White Rice (Cooked)', servingSize: '100g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, isCustom: false },
  { name: 'Brown Rice (Cooked)', servingSize: '100g', calories: 112, protein: 2.6, carbs: 24, fat: 0.9, isCustom: false },
  { name: 'Egg (Large, Boiled)', servingSize: '1 large (50g)', calories: 77, protein: 6.3, carbs: 0.6, fat: 5.3, isCustom: false },
  { name: 'Oatmeal (Cooked)', servingSize: '100g', calories: 71, protein: 2.5, carbs: 12, fat: 1.5, isCustom: false },
  { name: 'Apple', servingSize: '1 medium (182g)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, isCustom: false },
  { name: 'Banana', servingSize: '1 medium (118g)', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, isCustom: false },
  { name: 'Broccoli (Boiled)', servingSize: '100g', calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, isCustom: false },
  { name: 'Salmon (Cooked)', servingSize: '100g', calories: 206, protein: 22, carbs: 0, fat: 12, isCustom: false },
  { name: 'Sweet Potato (Cooked)', servingSize: '100g', calories: 90, protein: 2, carbs: 21, fat: 0.2, isCustom: false },
  { name: 'Almonds', servingSize: '1 oz (28g)', calories: 164, protein: 6, carbs: 6, fat: 14, isCustom: false },
  { name: 'Peanut Butter', servingSize: '2 tbsp (32g)', calories: 188, protein: 8, carbs: 6, fat: 16, isCustom: false },
  { name: 'Greek Yogurt (Plain, Non-fat)', servingSize: '100g', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, isCustom: false },
  { name: 'Milk (Whole)', servingSize: '1 cup (244g)', calories: 149, protein: 8, carbs: 12, fat: 8, isCustom: false },
  { name: 'Olive Oil', servingSize: '1 tbsp (14g)', calories: 119, protein: 0, carbs: 0, fat: 14, isCustom: false },
  { name: 'Avocado', servingSize: '1/2 medium (100g)', calories: 160, protein: 2, carbs: 8.5, fat: 14.7, isCustom: false },
  { name: 'Whey Protein Powder', servingSize: '1 scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 1.5, isCustom: false },
  { name: 'Ground Beef (80% Lean, Cooked)', servingSize: '100g', calories: 254, protein: 26, carbs: 0, fat: 16, isCustom: false },
  { name: 'Tofu (Firm)', servingSize: '100g', calories: 144, protein: 16, carbs: 3, fat: 9, isCustom: false },
  { name: 'Lentils (Cooked)', servingSize: '100g', calories: 116, protein: 9, carbs: 20, fat: 0.4, isCustom: false },
];

const seedFoods = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kaizen_db');
    console.log('Connected to MongoDB');

    // Remove existing global foods
    await FoodItem.deleteMany({ isCustom: false });
    console.log('Cleared existing global foods');

    // Insert new global foods
    await FoodItem.insertMany(globalFoods);
    console.log(`Successfully seeded ${globalFoods.length} global foods.`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding foods:', error);
    process.exit(1);
  }
};

seedFoods();
