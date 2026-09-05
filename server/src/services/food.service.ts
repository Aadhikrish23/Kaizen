import FoodItem from '../models/FoodItem';

export const searchFoods = async (userId: string, query: string, limit = 20) => {
  // Search global foods OR user's custom foods
  const searchCriteria: any = {
    $or: [
      { isCustom: false },
      { userId, isCustom: true }
    ]
  };

  if (query) {
    searchCriteria.name = { $regex: query, $options: 'i' };
  }

  return FoodItem.find(searchCriteria)
    .limit(limit)
    .sort({ isCustom: 1, name: 1 }); // Global items first, then alphabetical
};

export const createCustomFood = async (userId: string, data: any) => {
  const food = await FoodItem.create({
    ...data,
    userId,
    isCustom: true
  });
  return food;
};

export const deleteCustomFood = async (userId: string, foodId: string) => {
  const food = await FoodItem.findOneAndDelete({ _id: foodId, userId, isCustom: true });
  if (!food) {
    throw new Error('Food not found or you do not have permission to delete it');
  }
  return food;
};
