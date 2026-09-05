import React, { useState, useEffect, useRef } from 'react';
import { useSearchFoods } from '../../services/foodService';
import { FoodItem } from '../../types';
import { Search } from 'lucide-react';

interface FoodSearchProps {
  onSelectFood: (food: FoodItem) => void;
  className?: string;
}

export const FoodSearch: React.FC<FoodSearchProps> = ({ onSelectFood, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const { data: foods, isLoading } = useSearchFoods(query);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (food: FoodItem) => {
    onSelectFood(food);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kaizen-muted" />
        <input
          type="text"
          className="w-full bg-kaizen-bg border border-kaizen-border rounded-control pl-9 pr-3 py-2 text-sm text-kaizen-text focus:border-kaizen-primary outline-none transition-colors placeholder:text-kaizen-muted/60"
          placeholder="Search food database..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-kaizen-surface border border-kaizen-border rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-sm text-kaizen-muted">Searching...</div>
          ) : foods && foods.length > 0 ? (
            <div className="divide-y divide-kaizen-border/60">
              {foods.map((food) => (
                <button
                  key={food._id}
                  type="button"
                  onClick={() => handleSelect(food)}
                  className="w-full text-left px-3 py-2.5 hover:bg-kaizen-surface-hover transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-kaizen-text">
                      {food.name} {food.brand && <span className="text-kaizen-muted text-xs ml-1">({food.brand})</span>}
                    </p>
                    <p className="text-xs text-kaizen-muted mt-0.5 font-mono">
                      {food.servingSize} • {food.calories} kcal
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-kaizen-subtle">
                    P:{food.protein} C:{food.carbs} F:{food.fat}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-kaizen-muted">
              No foods found. Enter manually below.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
