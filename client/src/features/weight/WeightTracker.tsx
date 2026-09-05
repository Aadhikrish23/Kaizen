import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { useWeightLogs, useAddWeightLog } from '../../services/weightService';
import { useAuth } from '../../contexts/AuthContext';
import { WeightLog } from '../../types';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react';
import { MeasurementTracker } from './MeasurementTracker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeightTrackerProps {
  currentDate: string;
}

export const WeightTracker: React.FC<WeightTrackerProps> = ({ currentDate }) => {
  const { user } = useAuth();
  const { data: logsData, isLoading, error } = useWeightLogs(currentDate);
  const { mutateAsync: addWeightLog } = useAddWeightLog();

  const [weightInput, setWeightInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [activeTab, setActiveTab] = useState<'weight' | 'measurements'>('weight');

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
  }, [todayLog, currentDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;

    try {
      await addWeightLog({ weight: val, date: currentDate, notes: notesInput } as any);
    } catch (err) {
      console.error(err);
    }
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => a.date.localeCompare(b.date));
  }, [history]);

  const chartData = useMemo(() => {
    return sortedHistory.map(log => {
      const d = new Date(log.date);
      return {
        ...log,
        displayDate: `${d.getMonth()+1}/${d.getDate()}`
      };
    });
  }, [sortedHistory]);

  const latestWeight = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1].weight : null;
  const previousWeight = sortedHistory.length > 1 ? sortedHistory[sortedHistory.length - 2].weight : null;
  const delta = (latestWeight && previousWeight) ? (latestWeight - previousWeight).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-kaizen-text">Body Composition</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Track your weight and body measurements</p>
        </div>
        <div className="flex bg-kaizen-surface p-1 rounded-control border border-kaizen-border">
          <button
            onClick={() => setActiveTab('weight')}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeTab === 'weight' ? 'bg-kaizen-surface-elevated text-kaizen-text shadow-sm' : 'text-kaizen-muted hover:text-kaizen-text'}`}
          >
            Weight
          </button>
          <button
            onClick={() => setActiveTab('measurements')}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${activeTab === 'measurements' ? 'bg-kaizen-surface-elevated text-kaizen-text shadow-sm' : 'text-kaizen-muted hover:text-kaizen-text'}`}
          >
            Measurements
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-control">
          {(error as Error).message || 'Failed to load data'}
        </div>
      )}

      {activeTab === 'weight' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card title="Today's Weigh-In" subtitle="Log your morning weight">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-4 justify-center">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="text-center text-3xl font-bold font-mono py-6 border-2 focus:border-kaizen-weight"
                      step="0.1"
                      min="20"
                      max="300"
                      required
                    />
                    <span className="text-kaizen-muted font-mono font-bold">kg</span>
                  </div>
                  <Input
                    label="Notes (Optional)"
                    placeholder="e.g. After heavy dinner"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="primary" size="lg" className="w-full">
                  Save Weight
                </Button>
              </form>
            </Card>

            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-kaizen-text">Current Stats</span>
                <TrendingUp className="w-4 h-4 text-kaizen-muted" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-kaizen-muted mb-1">Latest Weight</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-kaizen-text">{latestWeight || '--'} kg</span>
                    {delta && (
                      <span className={`text-xs font-mono flex items-center ${parseFloat(delta) < 0 ? 'text-emerald-400' : parseFloat(delta) > 0 ? 'text-rose-400' : 'text-kaizen-muted'}`}>
                        {parseFloat(delta) < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : parseFloat(delta) > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                        {Math.abs(parseFloat(delta))} kg
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-kaizen-border">
                  <div className="text-xs text-kaizen-muted mb-1">Distance to Target ({targetWeight} kg)</div>
                  <div className="text-lg font-bold font-mono text-kaizen-text">
                    {latestWeight ? Math.abs(latestWeight - targetWeight).toFixed(1) : '--'} <span className="text-sm text-kaizen-muted">kg</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card title="Weight Trend" subtitle="Your progress over time" className="flex-1">
              <div className="h-64 mt-4">
                {isLoading ? (
                  <LoadingState message="Loading chart..." />
                ) : chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3340" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1C212B', borderColor: '#2D3340', borderRadius: '8px' }}
                        itemStyle={{ color: '#F472B6' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#F472B6" strokeWidth={3} dot={{ r: 4, fill: '#1C212B', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-kaizen-muted border border-dashed border-kaizen-border rounded-control">
                    Log at least 2 days of weight to see your trend line.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <MeasurementTracker currentDate={currentDate} />
      )}
    </div>
  );
};
