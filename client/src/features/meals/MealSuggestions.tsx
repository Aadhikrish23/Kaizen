import React from 'react';
import { Card } from '../../components/ui/Card';
import { useRecommendations } from '../../services/aiService';

interface Suggestion {
  id: string;
  type: 'food' | 'recipe';
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
  reason: string;
}

// Deterministic suggestions that fit today's remaining calories and protein (no AI involved).
export const MealSuggestions: React.FC<{ date: string; refreshKey?: number }> = ({ date, refreshKey }) => {
  const { data, isLoading } = useRecommendations(date, refreshKey);
  const items: Suggestion[] = Array.isArray(data) ? data : [];

  return (
    <Card title="Suggested for what's left today" subtitle="Foods and recipes that fit your remaining calories and protein">
      {isLoading ? (
        <p className="text-xs font-mono text-kaizen-muted">Loading suggestions...</p>
      ) : items.length === 0 ? (
        <p className="text-xs font-mono text-kaizen-muted">No suggestions: nothing fits the calories you have left, or the food database is empty.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={`${s.type}-${s.id}`} className="p-2.5 rounded-control border border-kaizen-border bg-kaizen-bg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-kaizen-text">
                  {s.name} <span className="text-[11px] text-kaizen-subtle">({s.servingLabel}{s.type === 'recipe' ? ', recipe' : ''})</span>
                </span>
                <span className="text-xs font-mono text-kaizen-muted">{s.calories} kcal | {s.protein} g protein</span>
              </div>
              <p className="text-[11px] text-kaizen-subtle mt-1">{s.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
