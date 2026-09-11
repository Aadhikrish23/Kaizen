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
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">Body Composition & Biometrics</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Scale telemetry and circumferential body metrics</p>
        </div>
        <div className="flex bg-kaizen-surface p-1 rounded-control border border-kaizen-border shadow-subtle">
          <button
            onClick={() => setActiveTab('weight')}
            className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-control transition-all ${
              activeTab === 'weight'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                : 'text-kaizen-muted hover:text-white'
            }`}
          >
            Scale Weight
          </button>
          <button
            onClick={() => setActiveTab('measurements')}
            className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-control transition-all ${
              activeTab === 'measurements'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                : 'text-kaizen-muted hover:text-white'
            }`}
          >
            Measurements
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-control">
          {(error as Error).message || 'Failed to load data'}
        </div>
      )}

      {activeTab === 'weight' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card title="Daily Weigh-In" subtitle={`Target Goal: ${targetWeight} kg`} className="card-sheen shadow-subtle">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-4 justify-center">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="text-center text-3xl font-bold font-mono py-6 border-2 focus:border-violet-500/80 focus:ring-violet-500/30 text-white"
                      step="0.1"
                      min="20"
                      max="300"
                      required
                    />
                    <span className="text-kaizen-muted font-mono font-bold text-lg">kg</span>
                  </div>
                  <Input
                    label="Notes (Optional)"
                    placeholder="e.g. Fasted morning weight"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="primary" size="lg" className="w-full font-semibold shadow-glow-emerald">
                  Save Weight
                </Button>
              </form>
            </Card>

            <Card className="p-5 card-sheen shadow-subtle">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-mono font-semibold text-kaizen-subtle uppercase tracking-wider">Telemetry Delta</span>
                <TrendingUp className="w-4 h-4 text-violet-400" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-mono text-kaizen-muted mb-1">Current Scale Weight</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-white">{latestWeight ? `${latestWeight} kg` : '--'}</span>
                    {delta && (
                      <span className={`text-xs font-mono px-2 py-0.5 rounded flex items-center ${
                        parseFloat(delta) < 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : parseFloat(delta) > 0
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-kaizen-bg text-kaizen-muted border border-kaizen-border'
                      }`}>
                        {parseFloat(delta) < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : parseFloat(delta) > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                        {Math.abs(parseFloat(delta))} kg
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t border-kaizen-border">
                  <div className="text-xs font-mono text-kaizen-muted mb-1">Distance to Target ({targetWeight} kg)</div>
                  <div className="text-xl font-bold font-mono text-violet-400">
                    {latestWeight ? `${Math.abs(latestWeight - targetWeight).toFixed(1)} kg` : '--'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card title="Weight Progression Curve" subtitle="Historical telemetry over time" className="flex-1 card-sheen shadow-subtle">
              <div className="h-72 mt-4">
                {isLoading ? (
                  <LoadingState message="Loading chart..." />
                ) : chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222A3C" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                      <YAxis stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} font-family="JetBrains Mono" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#131722', borderColor: '#222A3C', borderRadius: '8px', color: '#F1F3F7' }}
                        itemStyle={{ color: '#A78BFA' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: '#131722', strokeWidth: 2, stroke: '#8B5CF6' }} activeDot={{ r: 6, fill: '#8B5CF6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-mono text-kaizen-muted border border-dashed border-kaizen-border rounded-control">
                    Record at least 2 weigh-in logs to render trend telemetry.
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
