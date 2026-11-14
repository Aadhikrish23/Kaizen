import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useSearch } from '../services/aiService';

export type SearchTarget = 'meals' | 'workouts';

interface GlobalSearchProps {
  onNavigate: (target: SearchTarget) => void;
}

const useDebounced = (value: string, ms: number) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

// Grouped search dropdown. Foods/recipes open the Meals tab and exercises/routines the Workouts tab;
// there is no per-item detail page, so results are otherwise informational.
export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(query, 300);
  const { data, isFetching } = useSearch(debounced);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (target: SearchTarget) => {
    onNavigate(target);
    setOpen(false);
    setQuery('');
  };

  const groups = data
    ? [
        { key: 'foods', label: 'Foods', target: 'meals' as SearchTarget, rows: data.foods.map((f) => ({ id: f.id, title: f.name, sub: [f.brand, f.servingSize, f.calories !== undefined ? `${f.calories} kcal` : null].filter(Boolean).join(' | ') })) },
        { key: 'recipes', label: 'Recipes', target: 'meals' as SearchTarget, rows: data.recipes.map((r) => ({ id: r.id, title: r.name, sub: r.totalCalories !== undefined ? `${r.totalCalories} kcal` : '' })) },
        { key: 'exercises', label: 'Exercises', target: 'workouts' as SearchTarget, rows: data.exercises.map((e) => ({ id: e.id, title: e.name, sub: [e.targetMuscle, e.equipment].filter(Boolean).join(' | ') })) },
        { key: 'routines', label: 'Routines', target: 'workouts' as SearchTarget, rows: data.routines.map((r) => ({ id: r.id, title: r.name, sub: `${r.exercisesCount} exercises` })) },
      ]
    : [];
  const hasResults = groups.some((g) => g.rows.length > 0);
  const ready = debounced.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kaizen-muted pointer-events-none" />
      <input
        type="search"
        value={query}
        maxLength={100}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search foods, recipes, exercises, routines..."
        aria-label="Search"
        className="w-full bg-kaizen-surface border border-kaizen-border rounded-control pl-9 pr-3 py-2 text-sm text-kaizen-text outline-none focus:border-kaizen-primary placeholder:text-kaizen-muted/60"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-kaizen-surface border border-kaizen-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {!ready || isFetching ? (
            <p className="p-3 text-xs font-mono text-kaizen-muted">Searching...</p>
          ) : !hasResults ? (
            <p className="p-3 text-xs font-mono text-kaizen-muted">No results for "{debounced.trim()}".</p>
          ) : (
            groups.filter((g) => g.rows.length > 0).map((g) => (
              <div key={g.key} className="py-1">
                <p className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-kaizen-subtle">{g.label}</p>
                {g.rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => go(g.target)}
                    className="w-full text-left px-3 py-1.5 hover:bg-kaizen-surface-hover"
                  >
                    <span className="text-sm text-kaizen-text block">{r.title}</span>
                    {r.sub && <span className="text-[11px] font-mono text-kaizen-muted">{r.sub}</span>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
