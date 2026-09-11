import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';
import { useMealLogs, useAddMealLog, useDeleteMealLog } from '../../services/mealService';
import { useCreateRecipe } from '../../services/recipeService';
import { useAuth } from '../../contexts/AuthContext';
import { MealLog, FoodItem } from '../../types';
import { Trash2, Plus, Utensils, Sparkles } from 'lucide-react';
import { FoodSearch } from '../../components/ui/FoodSearch';
import { RecipeList } from './RecipeList';
import { RecipeExplorerModal } from './RecipeExplorerModal';

interface MealTrackerProps {
  currentDate: string;
  onUpdate?: () => void;
}

export const MealTracker: React.FC<MealTrackerProps> = ({ currentDate, onUpdate }) => {
  const { user } = useAuth();
  const { data: rawData, isLoading, error } = useMealLogs(currentDate);
  const { mutateAsync: addMealLog } = useAddMealLog();
  const { mutateAsync: deleteMealLog } = useDeleteMealLog(currentDate);
  const { mutateAsync: createRecipe } = useCreateRecipe();

  const handleSaveRecipe = async () => {
    if (!name || !calories) {
      alert('Please enter a name and calories to save as a recipe.');
      return;
    }
    
    try {
      await createRecipe({
        name,
        description: 'Saved from meal tracker',
        ingredients: [{
          name,
          servingSize: '1 serving',
          quantity: 1,
          calories: Number(calories),
          protein: protein ? Number(protein) : 0,
          carbs: carbs ? Number(carbs) : 0,
          fat: fat ? Number(fat) : 0
        }]
      });
      alert('Recipe saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save recipe.');
    }
  };

  const data = (rawData as any) || {
    date: currentDate,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    meals: [] as MealLog[]
  };

  // Form State
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [showRecipeExplorer, setShowRecipeExplorer] = useState(false);

  const calorieGoal = user?.calorieDailyTarget ?? 2000;
  const proteinGoal = user?.proteinDailyTargetG ?? 150;

  const handleLogFromRecipe = async (meal: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    try {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await addMealLog({
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        mealType: 'lunch',
        time,
        date: currentDate,
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !calories) return;

    try {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await addMealLog({
        name,
        calories: Number(calories),
        protein: protein ? Number(protein) : 0,
        carbs: carbs ? Number(carbs) : 0,
        fat: fat ? Number(fat) : 0,
        mealType,
        time,
        date: currentDate
      });

      // Reset Form
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMealLog(id);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const caloriePercent = Math.min(100, Math.round((data.totalCalories / calorieGoal) * 100));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-kaizen-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-control bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">Nutrition & Energy Balance</h2>
              <p className="text-xs text-kaizen-muted font-mono">Calorie Budget: {calorieGoal} kcal / day • Protein Goal: {proteinGoal}g</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowRecipeExplorer(true)}
            className="text-xs flex items-center gap-1.5 text-amber-400 hover:text-amber-300 border-amber-400/30 hover:border-amber-400 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Discover Recipes
          </Button>
          <div className="text-xs font-mono px-3 py-1.5 bg-kaizen-surface border border-kaizen-border rounded-control text-amber-400 font-semibold shadow-subtle">
            {data.totalCalories > calorieGoal
              ? `+${data.totalCalories - calorieGoal} kcal surplus`
              : `${calorieGoal - data.totalCalories} kcal remaining`}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-control">
          {(error as Error).message || 'Failed to load data'}
        </div>
      )}

      {/* Overview Stat Bar */}
      <div className="p-5 sm:p-6 bg-kaizen-surface border border-kaizen-border rounded-structural space-y-4 card-sheen shadow-subtle">
        {/* Calories */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-amber-400">
                {data.totalCalories.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-kaizen-muted">/ {calorieGoal} kcal ({caloriePercent}%)</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-kaizen-subtle">Caloric Adherence</span>
          </div>
          <div className="w-full h-2.5 bg-kaizen-bg rounded-full overflow-hidden border border-kaizen-border">
            <div
              className={`h-full transition-all duration-500 ${
                data.totalCalories > calorieGoal ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'
              }`}
              style={{ width: `${caloriePercent}%` }}
            />
          </div>
        </div>
        {/* Protein */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-emerald-400">{data.totalProtein}g</span>
              <span className="text-xs font-mono text-kaizen-muted">/ {proteinGoal}g ({Math.min(100, Math.round((data.totalProtein / proteinGoal) * 100))}%)</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-kaizen-subtle">Muscle Protein Synthesis</span>
          </div>
          <div className="w-full h-2 bg-kaizen-bg rounded-full overflow-hidden border border-kaizen-border">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((data.totalProtein / proteinGoal) * 100))}%` }}
            />
          </div>
        </div>
        {/* Carbs & Fat inline */}
        <div className="flex gap-4 text-xs font-mono text-kaizen-muted pt-2 border-t border-kaizen-border">
          <span className="bg-kaizen-bg px-2 py-0.5 rounded border border-kaizen-border">Carbohydrates: <strong className="text-white">{data.totalCarbs}g</strong></span>
          <span className="bg-kaizen-bg px-2 py-0.5 rounded border border-kaizen-border">Dietary Fat: <strong className="text-white">{data.totalFat}g</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Add Meal Form */}
        <div className="lg:col-span-5">
          <Card title="Log Meal" subtitle="Enter meal details and estimated calories">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-kaizen-muted">Find Food or Enter Name</label>
                <FoodSearch 
                  onSelectFood={(food: FoodItem) => {
                    setName(food.name);
                    setCalories(String(food.calories));
                    setProtein(String(food.protein));
                    setCarbs(String(food.carbs));
                    setFat(String(food.fat));
                  }} 
                  className="mb-2" 
                />
                <Input
                  placeholder="Or type manual meal name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Calories"
                  type="number"
                  placeholder="e.g. 450"
                  suffix="kcal"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  required
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-kaizen-muted">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as any)}
                    className="bg-kaizen-surface border border-kaizen-border rounded-control px-3 py-2 text-sm text-kaizen-text focus:border-kaizen-primary outline-none"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
              </div>

              {/* Optional Macros */}
              <div className="pt-2 border-t border-kaizen-border/60">
                <span className="text-[11px] font-mono text-kaizen-subtle uppercase tracking-wider block mb-2">
                  Macros (Optional)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Prot"
                    suffix="g"
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                  <Input
                    placeholder="Carb"
                    suffix="g"
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                  <Input
                    placeholder="Fat"
                    suffix="g"
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button type="button" variant="secondary" size="md" className="flex-1" onClick={handleSaveRecipe}>
                  Save as Recipe
                </Button>
                <Button type="submit" variant="primary" size="md" className="flex-1">
                  <Plus className="w-4 h-4 mr-1" /> Log Meal
                </Button>
              </div>
            </form>
          </Card>
          <RecipeList currentDate={currentDate} />
        </div>

        {/* Meal Logs List */}
        <div className="lg:col-span-7">
          <Card title="Today's Meals" subtitle={`${data.meals.length} meal entries recorded`}>
            {isLoading ? (
              <LoadingState message="Loading meals..." />
            ) : data.meals.length === 0 ? (
              <div className="py-8 text-center text-xs text-kaizen-muted border border-dashed border-kaizen-border rounded-control">
                <Utensils className="w-6 h-6 text-kaizen-subtle mx-auto mb-2 opacity-50" />
                No meals logged today yet.
              </div>
            ) : (
              <div className="divide-y divide-kaizen-border/60">
                {data.meals.map((meal: MealLog) => (
                  <div key={meal._id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-kaizen-text">{meal.name}</span>
                        <Badge variant="amber" size="sm">
                          {meal.mealType}
                        </Badge>
                        <span className="text-xs font-mono text-kaizen-subtle">{meal.time}</span>
                      </div>
                      {(meal.protein || meal.carbs || meal.fat) ? (
                        <div className="text-[11px] font-mono text-kaizen-muted flex gap-2">
                          {meal.protein ? <span>P: {meal.protein}g</span> : null}
                          {meal.carbs ? <span>C: {meal.carbs}g</span> : null}
                          {meal.fat ? <span>F: {meal.fat}g</span> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-kaizen-calories">
                        {meal.calories} kcal
                      </span>
                      <button
                        onClick={() => handleDelete(meal._id)}
                        className="text-kaizen-subtle hover:text-rose-400 p-1 transition-colors"
                        title="Delete meal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <RecipeExplorerModal
        isOpen={showRecipeExplorer}
        onClose={() => setShowRecipeExplorer(false)}
        onLogMeal={handleLogFromRecipe}
      />
    </div>
  );
};
