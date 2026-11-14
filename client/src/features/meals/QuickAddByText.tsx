import React, { useState } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useParseFood } from '../../services/aiService';
import { useAddMealLog } from '../../services/mealService';
import { amountUnitLabel, FoodLike, scaleFood } from '../../utils/nutrition';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface ParsedFoodResult {
  name: string;
  quantity: number;
  unit: string;
  source: 'database' | 'estimate';
  needsConfirmation: boolean;
  amount: number | null;
  food: (FoodLike & { name: string }) | null;
  nutrition: { calories: number; protein: number; carbs: number; fat: number } | null;
}

interface Row {
  key: number;
  name: string;
  food: (FoodLike & { name: string }) | null;
  amount: string; // in the food's basis units (g/ml or servings); empty when unknown
  // manual values for items without a database match
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const num = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return isFinite(n) && n >= 0 ? n : null;
};

// Macros for a row: scaled from the database food when matched, otherwise what the user typed.
const rowMacros = (r: Row) => {
  if (r.food) {
    const a = num(r.amount);
    return a !== null && a > 0 ? scaleFood(r.food, a) : null;
  }
  const calories = num(r.calories);
  if (calories === null) return null;
  return { calories, protein: num(r.protein) ?? 0, carbs: num(r.carbs) ?? 0, fat: num(r.fat) ?? 0 };
};

interface QuickAddByTextProps {
  currentDate: string;
  onUpdate?: () => void;
}

// Parses free text into items the user reviews and edits; nothing is saved until they confirm.
export const QuickAddByText: React.FC<QuickAddByTextProps> = ({ currentDate, onUpdate }) => {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [parser, setParser] = useState<'ai' | 'fallback' | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [message, setMessage] = useState<string | null>(null);
  const { mutateAsync: parseFood, isPending: isParsing } = useParseFood();
  const { mutateAsync: addMealLog, isPending: isSaving } = useAddMealLog();

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isParsing) return;
    setMessage(null);
    try {
      const res = await parseFood(text.trim());
      const items: ParsedFoodResult[] = res?.items || [];
      setParser(res?.source ?? null);
      setRows(
        items.map((it, i) => ({
          key: i,
          name: it.name,
          food: it.food,
          amount: it.amount !== null && it.amount !== undefined ? String(it.amount) : '',
          calories: '',
          protein: '',
          carbs: '',
          fat: '',
        }))
      );
      if (items.length === 0) setMessage('Nothing recognised. Try e.g. "2 rotis and 1 cup dal".');
    } catch {
      setMessage('Could not parse that text. Please try again or use the form below.');
    }
  };

  const updateRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const allValid = rows.length > 0 && rows.every((r) => r.name.trim() && rowMacros(r) !== null);

  const handleSave = async () => {
    if (!allValid) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    for (const r of rows) {
      const m = rowMacros(r)!;
      await addMealLog({ name: r.name.trim(), ...m, mealType, time, date: currentDate });
    }
    setRows([]);
    setText('');
    setParser(null);
    setMessage(`Added ${rows.length} item${rows.length === 1 ? '' : 's'}.`);
    if (onUpdate) onUpdate();
  };

  return (
    <Card title="Quick add by text" subtitle="Describe what you ate; review the items before anything is saved">
      <form onSubmit={handleParse} className="flex gap-2">
        <input
          type="text"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 2 rotis and 1 cup dal"
          aria-label="Describe your meal"
          className="flex-1 bg-kaizen-bg border border-kaizen-border rounded-control px-3 py-2 text-sm text-kaizen-text outline-none focus:border-kaizen-primary"
        />
        <Button type="submit" variant="secondary" disabled={isParsing || !text.trim()}>
          <Sparkles className="w-4 h-4" /> {isParsing ? 'Parsing...' : 'Parse'}
        </Button>
      </form>

      {message && <p className="mt-2 text-xs font-mono text-kaizen-muted">{message}</p>}

      {rows.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-[11px] font-mono text-kaizen-subtle">
            {parser === 'ai' ? 'Parsed by AI.' : 'Parsed by the basic parser (AI unavailable).'} Nutrition comes from the food database;
            items without a match need values from you.
          </p>
          {rows.map((r) => {
            const m = rowMacros(r);
            return (
              <div key={r.key} className="p-3 rounded-control border border-kaizen-border bg-kaizen-bg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={r.name}
                    onChange={(e) => updateRow(r.key, { name: e.target.value })}
                    aria-label="Food name"
                    className="flex-1 bg-transparent border-b border-kaizen-border text-sm text-kaizen-text outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    className="text-kaizen-subtle hover:text-rose-400 p-1"
                    title="Remove item"
                    aria-label={`Remove ${r.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {r.food ? (
                  <div className="flex items-center gap-2 text-xs font-mono text-kaizen-muted">
                    <label className="flex items-center gap-1.5">
                      Amount
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={r.amount}
                        onChange={(e) => updateRow(r.key, { amount: e.target.value })}
                        className="w-20 bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1 text-kaizen-text"
                      />
                      {amountUnitLabel(r.food)}
                    </label>
                    <span className="text-kaizen-subtle">matched: {r.food.name}</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[11px] font-mono text-amber-300">No database match: enter the nutrition yourself.</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(['calories', 'protein', 'carbs', 'fat'] as const).map((k) => (
                        <input
                          key={k}
                          type="number"
                          min="0"
                          step="any"
                          placeholder={k === 'calories' ? 'kcal' : `${k} g`}
                          aria-label={k}
                          value={r[k]}
                          onChange={(e) => updateRow(r.key, { [k]: e.target.value } as Partial<Row>)}
                          className="bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1 text-xs text-kaizen-text"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] font-mono text-kaizen-subtle">
                  {m ? `${m.calories} kcal | P ${m.protein} g | C ${m.carbs} g | F ${m.fat} g` : r.food ? 'Enter an amount to see nutrition.' : 'Calories required.'}
                </p>
              </div>
            );
          })}

          <div className="flex items-center gap-2">
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              aria-label="Meal category"
              className="bg-kaizen-surface border border-kaizen-border rounded-control px-3 py-2 text-sm text-kaizen-text outline-none"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
            <Button type="button" variant="primary" onClick={handleSave} disabled={!allValid || isSaving}>
              {isSaving ? 'Saving...' : `Add ${rows.length} item${rows.length === 1 ? '' : 's'}`}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRows([])}>Discard</Button>
          </div>
        </div>
      )}
    </Card>
  );
};
