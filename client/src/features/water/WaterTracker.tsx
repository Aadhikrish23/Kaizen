import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { LoadingState } from '../../components/ui/LoadingState';
import { useWaterLogs, useAddWaterLog, useDeleteWaterLog } from '../../services/waterService';
import { useAuth } from '../../contexts/AuthContext';
import { WaterLog } from '../../types';
import { Droplets, Trash2, Plus } from 'lucide-react';

interface WaterTrackerProps {
  currentDate: string;
  onUpdate?: () => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({ currentDate, onUpdate }) => {
  const [customAmount, setCustomAmount] = useState('');
  const { user } = useAuth();

  const goal = user?.waterDailyTargetMl ?? 2500;

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
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-kaizen-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-control bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">Hydration & Electrolyte Index</h2>
              <p className="text-xs text-kaizen-muted font-mono">Daily Target: {goal} ml / day • Fluid Telemetry</p>
            </div>
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1.5 bg-kaizen-surface border border-kaizen-border rounded-control text-cyan-400 font-semibold shadow-subtle">
          {totalAmount >= goal ? 'Goal Achieved • Optimal Hydration' : `${goal - totalAmount} ml deficit remaining`}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-control">
          {(error as Error).message || 'Failed to load data'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Visual Progress Meter */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-6 sm:p-8 bg-kaizen-surface border border-kaizen-border rounded-structural card-sheen shadow-subtle">
          <ProgressRing
            value={totalAmount}
            max={goal}
            size={190}
            strokeWidth={12}
            colorClass="text-cyan-400"
            label="Current"
            unit="ml"
          />
          <div className="mt-5 text-center">
            <span className="text-3xl font-bold font-mono tracking-tight text-white">
              {totalAmount.toLocaleString()}
            </span>
            <span className="text-sm font-mono text-kaizen-muted"> / {goal.toLocaleString()} ml</span>
            <span className="block text-[11px] font-mono text-cyan-400 mt-1 uppercase tracking-wider">
              {Math.round((totalAmount / goal) * 100)}% of daily quota
            </span>
          </div>
        </div>

        {/* Quick Log Controls & Custom Input */}
        <div className="md:col-span-7 flex flex-col gap-5">
          <Card title="Log Hydration Intake" subtitle="Select a calibrated volume or enter custom milliliters">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Button
                variant="secondary"
                size="md"
                className="flex-col py-3.5 border-kaizen-border hover:border-cyan-400/50 group bg-kaizen-bg/60"
                onClick={() => handleAddWater(250)}
              >
                <Droplets className="w-5 h-5 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-bold text-xs text-white">+250 ml</span>
                <span className="text-[10px] font-mono text-kaizen-subtle uppercase">Standard Cup</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="flex-col py-3.5 border-kaizen-border hover:border-cyan-400/50 group bg-kaizen-bg/60"
                onClick={() => handleAddWater(500)}
              >
                <Droplets className="w-5 h-5 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-bold text-xs text-white">+500 ml</span>
                <span className="text-[10px] font-mono text-kaizen-subtle uppercase">Sports Bottle</span>
              </Button>

              <Button
                variant="secondary"
                size="md"
                className="flex-col py-3.5 border-kaizen-border hover:border-cyan-400/50 group bg-kaizen-bg/60"
                onClick={() => handleAddWater(750)}
              >
                <Droplets className="w-5 h-5 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="font-mono font-bold text-xs text-white">+750 ml</span>
                <span className="text-[10px] font-mono text-kaizen-subtle uppercase">Hydration Flask</span>
              </Button>
            </div>

            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <Input
                type="number"
                min="10"
                max="5000"
                placeholder="Enter custom milliliters..."
                suffix="ml"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="primary" size="md" className="shrink-0 font-semibold px-5">
                <Plus className="w-4 h-4 mr-1" /> Log Water
              </Button>
            </form>
          </Card>

          {/* Today's History Log */}
          <Card title="Intake Timeline" subtitle={`${logs.length} logged entries recorded today`}>
            {isLoading ? (
              <LoadingState message="Loading logs..." />
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-kaizen-muted border border-dashed border-kaizen-border rounded-control">
                No hydration intake logged for this date.
              </div>
            ) : (
              <div className="divide-y divide-kaizen-border/60 max-h-48 overflow-y-auto pr-1">
                {logs.slice().reverse().map((item) => (
                  <div key={item._id} className="py-2.5 flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm"></span>
                      <span className="font-mono font-bold text-xs text-white">
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
