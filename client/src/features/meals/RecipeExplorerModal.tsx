import React, { useState } from 'react';
import { X, Search, Clock, Users, BookmarkPlus, Check, Flame, UtensilsCrossed } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { useExternalRecipes, useImportRecipe } from '../../services/externalFoodService';
import { ExternalRecipe } from '../../types';

interface RecipeExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMeal?: (meal: { name: string; calories: number; protein: number; carbs: number; fat: number }) => void;
}

const DIET_FILTERS = [
  { id: '', label: 'All Diets' },
  { id: 'high-protein', label: 'High-Protein' },
  { id: 'low-carb', label: 'Low-Carb' },
  { id: 'ketogenic', label: 'Keto' },
  { id: 'vegetarian', label: 'Vegetarian' },
];

export const RecipeExplorerModal: React.FC<RecipeExplorerModalProps> = ({
  isOpen,
  onClose,
  onLogMeal,
}) => {
  const [searchTerm, setSearchTerm] = useState('Chicken');
  const [query, setQuery] = useState('Chicken');
  const [diet, setDiet] = useState('');
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const { data: recipes, isLoading, error } = useExternalRecipes(query, diet || undefined);
  const { mutateAsync: importRecipe, isPending: isImporting } = useImportRecipe();

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setQuery(searchTerm.trim());
    }
  };

  const handleImport = async (recipe: ExternalRecipe) => {
    try {
      await importRecipe(recipe);
      setImportedIds((prev) => new Set(prev).add(recipe.externalId));
    } catch (err) {
      console.error('Failed to import recipe:', err);
    }
  };

  const handleLogDirectly = (recipe: ExternalRecipe) => {
    if (onLogMeal) {
      onLogMeal({
        name: recipe.name,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-kaizen-surface border border-kaizen-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-kaizen-border bg-kaizen-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-kaizen-text tracking-tight">Recipe Discovery</h2>
              <p className="text-xs text-kaizen-muted font-mono">Spoonacular & Curated Nutrition Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close recipes"
            className="p-1.5 text-kaizen-muted hover:text-kaizen-text rounded-md hover:bg-kaizen-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-5 border-b border-kaizen-border bg-kaizen-surface space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Search recipes (e.g., Salmon bowl, High protein oats, Steak salad)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Search className="w-4 h-4 text-kaizen-muted absolute left-3 top-3" />
            </div>
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>

          {/* Diet Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {DIET_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDiet(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${
                  diet === f.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-kaizen-bg text-kaizen-muted border border-kaizen-border hover:text-kaizen-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe Cards Grid */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading && <LoadingState message="Discovering recipes..." />}

          {error && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {(error as Error).message || 'Failed to fetch recipes'}
            </div>
          )}

          {!isLoading && (!recipes || recipes.length === 0) && (
            <div className="text-center py-12 text-kaizen-muted">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No recipes found for "{query}".</p>
              <p className="text-xs text-kaizen-subtle mt-1">Try another term like "Eggs", "Pasta", or "Chicken".</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes?.map((recipe) => {
              const isImported = importedIds.has(recipe.externalId);

              return (
                <div
                  key={recipe.externalId}
                  className="bg-kaizen-bg border border-kaizen-border hover:border-kaizen-border/80 rounded-xl p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Image & Title */}
                    <div className="flex gap-3 mb-3">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.name}
                          className="w-20 h-20 rounded-lg object-cover border border-kaizen-border shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-kaizen-surface border border-kaizen-border flex items-center justify-center shrink-0 text-kaizen-muted">
                          <UtensilsCrossed className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-kaizen-text truncate" title={recipe.name}>
                          {recipe.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-kaizen-muted font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {recipe.prepTimeMinutes}m
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
                          </span>
                        </div>
                        {recipe.description && (
                          <p className="text-xs text-kaizen-muted line-clamp-2 mt-1">
                            {recipe.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Macro Breakdown Strip */}
                    <div className="grid grid-cols-4 gap-1 p-2 rounded-lg bg-kaizen-surface border border-kaizen-border/60 text-center font-mono text-xs mb-3">
                      <div>
                        <span className="text-[10px] text-kaizen-muted block">CAL</span>
                        <strong className="text-amber-400 font-bold">{recipe.calories}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-kaizen-muted block">PRO</span>
                        <strong className="text-emerald-400 font-bold">{recipe.protein}g</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-kaizen-muted block">CARB</span>
                        <strong className="text-cyan-400 font-bold">{recipe.carbs}g</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-kaizen-muted block">FAT</span>
                        <strong className="text-rose-400 font-bold">{recipe.fat}g</strong>
                      </div>
                    </div>

                    {/* Ingredients summary */}
                    <div className="text-[11px] text-kaizen-muted mb-4">
                      <span className="font-semibold text-kaizen-text">Ingredients: </span>
                      {recipe.ingredients.slice(0, 4).map((i) => i.name).join(', ')}
                      {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4} more`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-kaizen-border/60">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleImport(recipe)}
                      disabled={isImported || isImporting}
                      className="text-xs"
                    >
                      {isImported ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Saved
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5 mr-1" /> Save to Recipes
                        </>
                      )}
                    </Button>

                    {onLogMeal && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleLogDirectly(recipe)}
                        className="text-xs"
                      >
                        <Flame className="w-3.5 h-3.5 mr-1" /> Log to Meals
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
