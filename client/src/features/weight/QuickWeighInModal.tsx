import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAddWeightLog, useWeightLogs } from '../../services/weightService';
import { useAuth } from '../../contexts/AuthContext';
import { Scale, X, Check, Target, TrendingDown, TrendingUp } from 'lucide-react';

interface QuickWeighInModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export const QuickWeighInModal: React.FC<QuickWeighInModalProps> = ({
  isOpen,
  onClose,
  defaultDate
}) => {
  const { user, updateUser } = useAuth();
  const todayStr = defaultDate || new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  const { data: logsData } = useWeightLogs(date);
  const { mutateAsync: addWeightLog, isPending } = useAddWeightLog();

  const history = Array.isArray(logsData) ? (logsData as any[]) : [];
  const existingLog = history.find(l => l.date === date);

  useEffect(() => {
    if (isOpen) {
      setDate(todayStr);
      setIsSaved(false);
      if (existingLog) {
        setWeight(existingLog.weight.toString());
        setNotes(existingLog.notes || '');
      } else if (user?.currentWeightKg) {
        setWeight(user.currentWeightKg.toString());
        setNotes('');
      } else {
        setWeight('70.0');
        setNotes('');
      }
    }
  }, [isOpen, defaultDate, existingLog?.weight]);

  if (!isOpen) return null;

  const targetWeight = user?.targetWeightKg ?? 70;
  const numWeight = parseFloat(weight) || 0;
  const diffFromTarget = numWeight > 0 ? numWeight - targetWeight : null;

  const handleAdjust = (delta: number) => {
    const current = parseFloat(weight) || 70;
    const updated = Math.max(20, Math.round((current + delta) * 10) / 10);
    setWeight(updated.toFixed(1));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numWeight || numWeight <= 0) return;

    try {
      await addWeightLog({
        weight: numWeight,
        date,
        notes
      } as any);
      if (updateUser) {
        updateUser({ currentWeightKg: numWeight });
      }
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 750);
    } catch (err) {
      console.error('Failed to log weight', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-kaizen-card border border-kaizen-border rounded-xl shadow-2xl p-6 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-kaizen-border mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Quick Weigh-In</h3>
              <p className="text-xs text-kaizen-text-secondary">Log your daily scale measurement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-kaizen-text-secondary hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Date Selector */}
          <div>
            <label className="block text-xs font-medium text-kaizen-text-secondary mb-1.5 uppercase tracking-wider">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-kaizen-bg border-kaizen-border text-white text-sm"
            />
          </div>

          {/* Weight Input with Quick Adjustors */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-kaizen-text-secondary uppercase tracking-wider">
                Body Weight (kg)
              </label>
              {targetWeight && (
                <div className="flex items-center gap-1.5 text-xs text-kaizen-text-muted">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target: <span className="font-mono text-white font-medium">{targetWeight} kg</span></span>
                </div>
              )}
            </div>

            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="75.0"
                required
                className="text-2xl font-mono text-white bg-kaizen-bg border-kaizen-border h-14 pl-4 pr-12 font-semibold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-kaizen-text-muted">
                kg
              </span>
            </div>

            {/* Quick Adjust Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-2.5">
              {[
                { label: '-0.5', delta: -0.5 },
                { label: '-0.1', delta: -0.1 },
                { label: '+0.1', delta: 0.1 },
                { label: '+0.5', delta: 0.5 },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleAdjust(item.delta)}
                  className="py-1 px-2 text-xs font-mono bg-white/5 hover:bg-white/10 text-kaizen-text-secondary hover:text-white border border-white/5 rounded-md transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Delta Indicator */}
          {diffFromTarget !== null && numWeight > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-kaizen-bg border border-kaizen-border text-xs">
              <span className="text-kaizen-text-secondary">Delta to Target:</span>
              <div className="flex items-center gap-1.5 font-mono">
                {diffFromTarget > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400">+{diffFromTarget.toFixed(1)} kg above</span>
                  </>
                ) : diffFromTarget < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">{Math.abs(diffFromTarget).toFixed(1)} kg below</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">At Goal Weight!</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div>
            <label htmlFor="weigh-in-notes" className="block text-xs font-medium text-kaizen-text-secondary mb-1.5 uppercase tracking-wider">
              Notes (Optional)
            </label>
            <Input
              id="weigh-in-notes"
              type="text"
              placeholder="e.g. Fasted morning weigh-in, post water"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="bg-kaizen-bg border-kaizen-border text-xs text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-1/3 border-kaizen-border text-kaizen-text-secondary hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !numWeight || numWeight <= 0}
              className={`flex-1 flex items-center justify-center gap-2 font-medium ${
                isSaved 
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : isPending ? (
                'Saving...'
              ) : (
                'Save Weigh-In'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
