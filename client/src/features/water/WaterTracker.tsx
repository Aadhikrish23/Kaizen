import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { LoadingState } from '../../components/ui/LoadingState';
import { useWaterLogs, useAddWaterLog, useDeleteWaterLog } from '../../services/waterService';
import { WaterLog } from '../../types';
import { Droplets, Trash2, Plus } from 'lucide-react';

interface WaterTrackerProps {
  currentDate: string;
  onUpdate?: () => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({ currentDate, onUpdate }) => {
  const [customAmount, setCustomAmount] = useState('');

  const goal = 2500; // 2500 ml baseline daily hydration target

  const { data, isLoading, error } = useWaterLogs(currentDate);
  const { mutateAsync: addWaterLog } = useAddWaterLog();
  const { mutateAsync: deleteWaterLog } = useDeleteWaterLog(currentDate);

  const logs: WaterLog[] = (data as any)?.logs || [];
  const totalAmount: number = (data as any)?.totalAmount || 0;

  const handleAddWater = async (amount: number) => {
    try {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await addWaterLog({ amount, time, date: currentDate });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customAmount, 10);
    if (parsed > 0) {
      await handleAddWater(parsed);
      setCustomAmount('');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWaterLog(id);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-kaizen-text">Hydration Tracking</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Target: {goal} ml / day</p>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 bg-kaizen-surface border border-kaizen-border rounded-control text-kaizen-water">
          {totalAmount >= goal ? 'Goal Achieved' : `${goal - totalAmount} ml remaining`}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-control">
          {(error as Error).message || 'Failed to load data'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Visual Progress Meter */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-kaizen-surface border border-kaizen-border rounded-structural">
          <ProgressRing
            value={totalAmount}
            max={goal}
            size={180}
            strokeWidth={12}
            colorClass="text-kaizen-water"
            label="Intake"
            unit="ml"
          />
          <div className="mt-4 text-center">
            <span className="text-2xl font-bold font-mono tracking-tight text-kaizen-text">
              {totalAmount.toLocaleString()}
            </span>
            <span className="text-sm font-mono text-kaizen-muted"> / {goal.toLocaleString()} ml</span>
          </div>
        </div>

        {/* Quick Log Controls & Custom Input */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <Card title="Log Water Intake" subtitle="Tap a preset or enter a custom amount">
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <Button
                variant="secondary"
                size="md"
                className="flex-col py-3 border-kaizen-border hover:border-kaizen-water/50 group"
                onClick={() => handleAddWater(250)}
              >
                <Droplets className="w-4 h-4 text-kaizen-water mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-semibold text-xs">+250 ml</span>
                <span className="text-[10px] text-kaizen-subtle">Glass</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="flex-col py-3 border-kaizen-border hover:border-kaizen-water/50 group"
                onClick={() => handleAddWater(500)}
              >
                <Droplets className="w-4 h-4 text-kaizen-water mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-semibold text-xs">+500 ml</span>
                <span className="text-[10px] text-kaizen-subtle">Bottle</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="flex-col py-3 border-kaizen-border hover:border-kaizen-water/50 group"
                onClick={() => handleAddWater(750)}
              >
                <Droplets className="w-4 h-4 text-kaizen-water mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-semibold text-xs">+750 ml</span>
                <span className="text-[10px] text-kaizen-subtle">Large Flask</span>
              </Button>
            </div>

            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <Input
                type="number"
                min="10"
                max="5000"
                placeholder="Custom amount"
                suffix="ml"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
              <Button type="submit" variant="primary" size="md" className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Log
              </Button>
            </form>
          </Card>

          {/* Today's History Log */}
          <Card title="Today's Logs" subtitle={`${logs.length} entries recorded today`}>
            {isLoading ? (
              <LoadingState message="Loading logs..." />
            ) : logs.length === 0 ? (
              <div className="py-6 text-center text-xs text-kaizen-muted border border-dashed border-kaizen-border rounded-control">
                No water logged yet today.
              </div>
            ) : (
              <div className="divide-y divide-kaizen-border/60 max-h-48 overflow-y-auto pr-1">
                {logs.slice().reverse().map((item) => (
                  <div key={item._id} className="py-2.5 flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-kaizen-water"></span>
                      <span className="font-mono font-medium text-sm text-kaizen-text">
                        +{item.amount} ml
                      </span>
                      <span className="text-xs font-mono text-kaizen-subtle">
                        {item.time}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-kaizen-subtle hover:text-rose-400 p-1 transition-colors"
                      title="Delete log"
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
