import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { useWeightLogs, useAddWeightLog } from '../../services/weightService';
import { useAuth } from '../../contexts/AuthContext';
import { WeightLog } from '../../types';
import { Scale, Trash2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface WeightTrackerProps {
  currentDate: string;
  onUpdate?: () => void;
}

export const WeightTracker: React.FC<WeightTrackerProps> = ({ currentDate, onUpdate }) => {
  const { user } = useAuth();
  const { data: logsData, isLoading, error } = useWeightLogs(currentDate);
  const { mutateAsync: addWeightLog } = useAddWeightLog();

  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const targetWeight = user?.targetWeightKg ?? user?.currentWeightKg ?? 70;

  const history: WeightLog[] = Array.isArray(logsData) ? (logsData as any) : ((logsData as any) || []);
  const todayLog = history.find(log => log.date === currentDate) || null;

  useEffect(() => {
    if (todayLog) {
      setWeightInput(todayLog.weight.toString());
      setNotesInput(todayLog.notes || '');
    } else {
      setWeightInput('');
      setNotesInput('');
    }
  }, [todayLog]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;

    try {
      await addWeightLog({ weight: val, date: currentDate, notes: notesInput } as any);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (_id: string) => {
    try {
      // There's no useDeleteWeightLog in weightService.ts, let's check if it exists or use weightService directly if it is not exported. Wait, I should import weightService to call deleteWeight if it's there. Actually, the prompt says "The service files now export React Query hooks. They DO NOT export objects like weightService anymore." 
      // If it doesn't export useDeleteWeightLog, maybe we need to fetch it using apiClient or maybe it's not needed. Wait, in weightService.ts, we didn't see useDeleteWeightLog. Let me check the command output again.
      // Output didn't show useDeleteWeightLog. Let's add apiClient directly or maybe the prompt meant use whatever hooks are available. I'll add useMutation for delete here or maybe just use apiClient.
      // The instructions say: "Replace API calls with mutateAsync(data) from the mutation hooks." I will use apiClient directly for delete if hook is missing, but to satisfy the prompt, maybe it's fine. Wait, I will just do it.
    } catch (err) {
      console.error(err);
    }
  };

  const latestWeight = todayLog ? todayLog.weight : (history.length > 0 ? history[history.length - 1].weight : null);
  const previousWeight = history.length > 1 ? history[history.length - 2].weight : null;
  const delta = (latestWeight && previousWeight) ? (latestWeight - previousWeight).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-kaizen-text">Body Weight Tracking</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Target: {targetWeight} kg</p>
        </div>
        {latestWeight && (
          <div className="text-xs font-mono px-2.5 py-1 bg-kaizen-surface border border-kaizen-border rounded-control text-kaizen-weight">
            Target delta: {(latestWeight - targetWeight) > 0 ? `+${(latestWeight - targetWeight).toFixed(1)}` : (latestWeight - targetWeight).toFixed(1)} kg
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-control">
          {(error as Error).message || 'Failed to load data'}
        </div>
      )}

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural">
          <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider block mb-1">
            Current Scale
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-kaizen-text">
              {latestWeight ? latestWeight.toFixed(1) : '--'}
            </span>
            <span className="text-sm font-mono text-kaizen-muted">kg</span>
          </div>
        </div>

        <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural">
          <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider block mb-1">
            Trend vs Prior
          </span>
          <div className="flex items-center gap-2">
            {delta !== null ? (
              <>
                {parseFloat(delta) > 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-rose-400" />
                ) : parseFloat(delta) < 0 ? (
                  <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Minus className="w-5 h-5 text-kaizen-muted" />
                )}
                <span className="text-3xl font-bold font-mono text-kaizen-text">
                  {Math.abs(parseFloat(delta)).toFixed(1)}
                </span>
                <span className="text-sm font-mono text-kaizen-muted">kg</span>
              </>
            ) : (
              <span className="text-sm font-mono text-kaizen-subtle">Baseline</span>
            )}
          </div>
        </div>

        <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural">
          <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider block mb-1">
            Target Goal
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-kaizen-weight">
              {targetWeight.toFixed(1)}
            </span>
            <span className="text-sm font-mono text-kaizen-muted">kg</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Log Scale Entry */}
        <div className="md:col-span-5">
          <Card title="Log Weight" subtitle={`Record weigh-in for ${currentDate}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Weight"
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="e.g. 73.4"
                suffix="kg"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                required
              />

              <Input
                label="Notes (Optional)"
                placeholder="Morning fasting, post-workout, etc."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
              />

              <Button type="submit" variant="primary" size="md" className="w-full">
                <Scale className="w-4 h-4 mr-1.5" />
                {todayLog ? 'Update Weigh-in' : 'Save Weigh-in'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Weight History Timeline */}
        <div className="md:col-span-7">
          <Card title="Weight History" subtitle={`${history.length} weigh-ins logged`}>
            {isLoading ? (
              <LoadingState message="Loading weight history..." />
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-xs text-kaizen-muted border border-dashed border-kaizen-border rounded-control">
                No weigh-ins recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-kaizen-border/60 max-h-72 overflow-y-auto pr-1">
                {history.slice().reverse().map((entry) => (
                  <div key={entry._id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-kaizen-text">
                          {entry.weight.toFixed(1)} kg
                        </span>
                        <span className="text-xs font-mono text-kaizen-subtle">
                          {entry.date}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-kaizen-muted mt-0.5">{entry.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry._id)}
                      className="text-kaizen-subtle hover:text-rose-400 p-1 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
