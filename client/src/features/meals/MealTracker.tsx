import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';
import { useMealLogs, useAddMealLog, useDeleteMealLog } from '../../services/mealService';
import { MealLog } from '../../types';
import { Trash2, Plus, Utensils } from 'lucide-react';

interface MealTrackerProps {
  currentDate: string;
  onUpdate?: () => void;
}

export const MealTracker: React.FC<MealTrackerProps> = ({ currentDate, onUpdate }) => {
  const { data: rawData, isLoading, error } = useMealLogs(currentDate);
  const { mutateAsync: addMealLog } = useAddMealLog();
  const { mutateAsync: deleteMealLog } = useDeleteMealLog(currentDate);

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

  const calorieGoal = 2200;

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-kaizen-text">Nutrition & Calories</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Calorie Budget: {calorieGoal} kcal / day</p>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 bg-kaizen-surface border border-kaizen-border rounded-control text-kaizen-calories">
          {data.totalCalories > calorieGoal
            ? `+${data.totalCalories - calorieGoal} kcal over budget`
            : `${calorieGoal - data.totalCalories} kcal remaining`}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-control">
          {(error as Error).message || 'Failed to load data'}
        </div>
      )}

      {/* Overview Stat Bar */}
      <div className="p-5 bg-kaizen-surface border border-kaizen-border rounded-structural">
        <div className="flex justify-between items-baseline mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-kaizen-text">
              {data.totalCalories.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-kaizen-muted">/ {calorieGoal} kcal ({caloriePercent}%)</span>
          </div>
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-kaizen-muted">P: <strong className="text-kaizen-text">{data.totalProtein}g</strong></span>
            <span className="text-kaizen-muted">C: <strong className="text-kaizen-text">{data.totalCarbs}g</strong></span>
            <span className="text-kaizen-muted">F: <strong className="text-kaizen-text">{data.totalFat}g</strong></span>
          </div>
        </div>

        <div className="w-full h-2 bg-kaizen-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              data.totalCalories > calorieGoal ? 'bg-rose-500' : 'bg-kaizen-calories'
            }`}
            style={{ width: `${caloriePercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Add Meal Form */}
        <div className="lg:col-span-5">
          <Card title="Log Meal" subtitle="Enter meal details and estimated calories">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Meal Name"
                placeholder="e.g. Scrambled eggs & sourdough"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

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

              <Button type="submit" variant="primary" size="md" className="w-full mt-2">
                <Plus className="w-4 h-4 mr-1" /> Log Meal
              </Button>
            </form>
          </Card>
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
    </div>
  );
};
