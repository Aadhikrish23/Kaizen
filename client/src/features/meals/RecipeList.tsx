import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { useRecipes, useDeleteRecipe } from '../../services/recipeService';
import { useAddMealLog } from '../../services/mealService';
import { Plus, Trash2, BookOpen } from 'lucide-react';

interface RecipeListProps {
  currentDate: string;
}

export const RecipeList: React.FC<RecipeListProps> = ({ currentDate }) => {
  const { data: recipes, isLoading } = useRecipes();
  const { mutateAsync: addMealLog } = useAddMealLog();
  const { mutateAsync: deleteRecipe } = useDeleteRecipe();

  const handleLogRecipe = async (recipe: any) => {
    try {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await addMealLog({
        name: recipe.name,
        calories: recipe.totalCalories,
        protein: recipe.totalProtein,
        carbs: recipe.totalCarbs,
        fat: recipe.totalFat,
        mealType: 'lunch', // Default, user can change in future
        time,
        date: currentDate
      });
      alert(`${recipe.name} logged successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to log recipe.');
    }
  };

  if (isLoading) return <LoadingState message="Loading recipes..." />;

  return (
    <Card title="Saved Recipes" subtitle={`${recipes?.length || 0} recipes available`} className="mt-6">
      {(!recipes || recipes.length === 0) ? (
        <div className="py-6 text-center text-xs text-kaizen-muted border border-dashed border-kaizen-border rounded-control">
          <BookOpen className="w-5 h-5 text-kaizen-subtle mx-auto mb-2 opacity-50" />
          No saved recipes yet. Save a meal to create one!
        </div>
      ) : (
        <div className="divide-y divide-kaizen-border/60 max-h-60 overflow-y-auto pr-2">
          {recipes.map((recipe: any) => (
            <div key={recipe._id} className="py-3 flex items-center justify-between group">
              <div>
                <p className="text-sm font-medium text-kaizen-text">{recipe.name}</p>
                <div className="flex gap-2 mt-1 text-[11px] font-mono text-kaizen-muted">
                  <span className="text-kaizen-calories">{recipe.totalCalories} kcal</span>
                  <span>P: {recipe.totalProtein}g</span>
                  <span>C: {recipe.totalCarbs}g</span>
                  <span>F: {recipe.totalFat}g</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="primary" size="sm" onClick={() => handleLogRecipe(recipe)}>
                  <Plus className="w-3.5 h-3.5" /> Log
                </Button>
                <button
                  onClick={() => deleteRecipe(recipe._id)}
                  className="text-kaizen-subtle hover:text-rose-400 p-1 transition-colors"
                  title="Delete recipe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
