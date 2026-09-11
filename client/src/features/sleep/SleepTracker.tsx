import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import {
  useSleepLog,
  useSleepHistory,
  useCircadianWindows,
  useSaveSleepLog,
  useDeleteSleepLog
} from '../../services/sleepService';
import {
  Moon,
  Sun,
  Clock,
  Sparkles,
  BatteryCharging,
  Award,
  Zap,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

interface SleepTrackerProps {
  currentDate: string;
}

export const SleepTracker: React.FC<SleepTrackerProps> = ({ currentDate }) => {
  const { data: sleepLog, isLoading: isLogLoading } = useSleepLog(currentDate);
  const { data: sleepHistory = [], isLoading: isHistoryLoading } = useSleepHistory();
  const { mutateAsync: saveSleep, isPending: isSaving } = useSaveSleepLog();
  const { mutateAsync: deleteSleep, isPending: isDeleting } = useDeleteSleepLog();

  // Local form state
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState<number>(4);
  const [notes, setNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Circadian planner state
  const [plannedWakeTime, setPlannedWakeTime] = useState('07:00');
  const { data: circadianWindows = [] } = useCircadianWindows(plannedWakeTime);

  // Sync form when sleepLog loads
  useEffect(() => {
    if (sleepLog) {
      setBedtime(sleepLog.bedtime || '23:00');
      setWakeTime(sleepLog.wakeTime || '07:00');
      setQuality(sleepLog.quality || 4);
      setNotes(sleepLog.notes || '');
    } else {
      setBedtime('23:00');
      setWakeTime('07:00');
      setQuality(4);
      setNotes('');
    }
  }, [sleepLog, currentDate]);

  // Compute live duration & cycles from current inputs
  const liveDurationMinutes = useMemo(() => {
    const parse = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const b = parse(bedtime);
    const w = parse(wakeTime);
    return w >= b ? w - b : (24 * 60 - b) + w;
  }, [bedtime, wakeTime]);

  const liveCycles = (liveDurationMinutes / 90).toFixed(1);
  const liveHours = Math.floor(liveDurationMinutes / 60);
  const liveMinutes = liveDurationMinutes % 60;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSleep({
        date: currentDate,
        bedtime,
        wakeTime,
        quality,
        notes
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save sleep log', err);
    }
  };

  const handleDelete = async () => {
    if (!sleepLog?._id) return;
    if (window.confirm('Delete this sleep record?')) {
      try {
        await deleteSleep(sleepLog._id);
      } catch (err) {
        console.error('Failed to delete sleep log', err);
      }
    }
  };

  // Chart data preparation
  const chartData = useMemo(() => {
    const list = [...sleepHistory].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    return list.map(item => {
      const d = new Date(item.date);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const hours = Number((item.durationMinutes / 60).toFixed(1));
      return {
        date: item.date,
        day: dayLabel,
        hours,
        cycles: item.cyclesCount,
        score: item.recoveryScore
      };
    });
  }, [sleepHistory]);

  if (isLogLoading || isHistoryLoading) {
    return <LoadingState message="Loading circadian sleep analysis..." />;
  }

  const recoveryScore = sleepLog?.recoveryScore ?? Math.min(100, Math.round((liveDurationMinutes / 480) * 60 + (quality / 5) * 40));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Headline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Recovery Score */}
        <Card className="relative overflow-hidden border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-kaizen-surface to-kaizen-surface card-sheen shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold text-indigo-300 uppercase tracking-wider">Recovery Readiness</span>
            <BatteryCharging className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">{recoveryScore}</span>
            <span className="text-xs font-mono text-indigo-300/70">/ 100</span>
          </div>
          <div className="mt-2 text-xs text-kaizen-muted flex items-center gap-1.5 font-sans">
            {recoveryScore >= 85 ? (
              <span className="text-emerald-400 font-medium">Optimal Neuro-Physical Reset</span>
            ) : recoveryScore >= 70 ? (
              <span className="text-cyan-400 font-medium">Good Restorative Window</span>
            ) : (
              <span className="text-amber-400 font-medium">Mild Sleep Debt Detected</span>
            )}
          </div>
        </Card>

        {/* Total Sleep Time */}
        <Card className="card-sheen shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider">Total Rest Window</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-white">
              {sleepLog ? Math.floor(sleepLog.durationMinutes / 60) : liveHours}h{' '}
              {sleepLog ? sleepLog.durationMinutes % 60 : liveMinutes}m
            </span>
          </div>
          <p className="mt-2 text-xs font-mono text-kaizen-muted">Target: 8h 00m (480 min)</p>
        </Card>

        {/* 90-Min Cycles */}
        <Card className="card-sheen shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider">Ultradian Cycles</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-400">
              {sleepLog ? sleepLog.cyclesCount : liveCycles}
            </span>
            <span className="text-xs font-mono text-kaizen-muted">cycles (90m)</span>
          </div>
          <p className="mt-2 text-xs font-mono text-kaizen-muted">5 complete cycles recommended</p>
        </Card>

        {/* Sleep Quality */}
        <Card className="card-sheen shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider">Subjective Depth</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {sleepLog ? sleepLog.quality : quality}
            </span>
            <span className="text-xs font-mono text-kaizen-muted">/ 5 rating</span>
          </div>
          <p className="mt-2 text-xs text-kaizen-muted font-sans">
            {quality >= 4 ? 'Deep, restorative sleep' : quality === 3 ? 'Average recovery' : 'Restless or fragmented'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Logger Form & Architecture */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Sleep Log Card */}
          <Card
            title="Log Sleep Session"
            subtitle={`Record bed and wake times for ${currentDate}`}
            action={
              sleepLog && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 text-xs text-rose-400/80 hover:text-rose-400 p-1 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )
            }
          >
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bedtime */}
                <div className="p-3.5 rounded-xl bg-kaizen-bg border border-kaizen-border space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-300">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Bedtime</span>
                  </div>
                  <Input
                    type="time"
                    value={bedtime}
                    onChange={e => setBedtime(e.target.value)}
                    className="bg-kaizen-card border-kaizen-border text-white text-lg font-mono"
                    required
                  />
                  <p className="text-[11px] text-kaizen-text-muted">Lights out / intention to sleep</p>
                </div>

                {/* Wake Time */}
                <div className="p-3.5 rounded-xl bg-kaizen-bg border border-kaizen-border space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Wake Time</span>
                  </div>
                  <Input
                    type="time"
                    value={wakeTime}
                    onChange={e => setWakeTime(e.target.value)}
                    className="bg-kaizen-card border-kaizen-border text-white text-lg font-mono"
                    required
                  />
                  <p className="text-[11px] text-kaizen-text-muted">Final morning awaken time</p>
                </div>
              </div>

              {/* Sleep Quality Selector */}
              <div>
                <label className="block text-xs font-medium text-kaizen-text-secondary uppercase tracking-wider mb-2">
                  Sleep Quality & Restfulness
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setQuality(star)}
                      className={`py-2.5 px-3 rounded-lg border text-center transition-all ${
                        quality === star
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold shadow-sm'
                          : 'bg-kaizen-bg border-kaizen-border text-kaizen-text-muted hover:border-kaizen-border/80 hover:text-kaizen-text-secondary'
                      }`}
                    >
                      <div className="text-sm font-mono">{star} ★</div>
                      <div className="text-[10px] mt-0.5">
                        {star === 5 ? 'Excellent' : star === 4 ? 'Great' : star === 3 ? 'Fair' : star === 2 ? 'Poor' : 'Awful'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="sleep-notes" className="block text-xs font-medium text-kaizen-text-secondary uppercase tracking-wider mb-1.5">
                  Sleep Environment & Factors (Optional)
                </label>
                <Input
                  id="sleep-notes"
                  type="text"
                  placeholder="Sleep environment, supplements, room temp..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="bg-kaizen-bg border-kaizen-border text-xs text-white"
                />
              </div>

              {/* Live Preview Summary */}
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-xs text-indigo-200 font-medium">
                      Calculated Duration: <span className="font-mono text-white font-bold">{liveHours}h {liveMinutes}m</span>
                    </div>
                    <div className="text-[11px] text-kaizen-text-muted">
                      Completes approximately <span className="font-mono text-indigo-300">{liveCycles}</span> cycles
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className={`min-w-[140px] flex items-center justify-center gap-2 font-medium ${
                    saveSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Logged!
                    </>
                  ) : isSaving ? (
                    'Saving...'
                  ) : sleepLog ? (
                    'Update Sleep Log'
                  ) : (
                    'Save Sleep Log'
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* 90-Minute Sleep Cycle Visualizer */}
          <Card
            title="Ultradian Sleep Cycle Architecture"
            subtitle="The human brain cycles between NREM (Deep) and REM sleep in ~90-minute waves"
          >
            <div className="space-y-4">
              {/* Cycle blocks */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(idx => {
                  const targetMins = idx * 90;
                  const h = Math.floor(targetMins / 60);
                  const m = targetMins % 60;
                  const activeDuration = sleepLog ? sleepLog.durationMinutes : liveDurationMinutes;
                  const isCompleted = activeDuration >= targetMins;
                  const isCurrent = activeDuration >= targetMins - 90 && activeDuration < targetMins;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isCompleted
                          ? 'bg-indigo-900/30 border-indigo-500/50 text-white'
                          : isCurrent
                          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/30'
                          : 'bg-kaizen-bg/60 border-kaizen-border/50 text-kaizen-text-muted'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wider mb-1">
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>Cycle {idx}</span>
                      </div>
                      <div className="text-sm font-mono font-semibold">
                        {h}h {m > 0 ? `${m}m` : ''}
                      </div>
                      <div className="text-[10px] text-kaizen-text-muted mt-1">
                        {idx <= 2 ? 'Deep/Physical' : idx === 3 ? 'Balanced' : 'REM/Cognitive'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stage breakdown progress */}
              {sleepLog && (
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-xs text-kaizen-text-secondary">
                    <span>Estimated Stages Breakdown</span>
                    <span className="font-mono">{sleepLog.durationMinutes} min total</span>
                  </div>
                  <div className="h-3 w-full bg-kaizen-bg rounded-full overflow-hidden flex border border-kaizen-border">
                    <div
                      style={{ width: `${(sleepLog.deepSleepMinutes / sleepLog.durationMinutes) * 100}%` }}
                      className="bg-indigo-500 h-full"
                      title={`Deep Sleep: ${sleepLog.deepSleepMinutes} min`}
                    />
                    <div
                      style={{ width: `${(sleepLog.remSleepMinutes / sleepLog.durationMinutes) * 100}%` }}
                      className="bg-purple-500 h-full"
                      title={`REM Sleep: ${sleepLog.remSleepMinutes} min`}
                    />
                    <div
                      style={{ width: `${(sleepLog.lightSleepMinutes / sleepLog.durationMinutes) * 100}%` }}
                      className="bg-sky-500 h-full"
                      title={`Light Sleep: ${sleepLog.lightSleepMinutes} min`}
                    />
                    <div
                      style={{ width: `${(sleepLog.awakeMinutes / sleepLog.durationMinutes) * 100}%` }}
                      className="bg-rose-500/50 h-full"
                      title={`Awake: ${sleepLog.awakeMinutes} min`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-kaizen-text-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span>Deep: <strong className="text-white font-mono">{sleepLog.deepSleepMinutes}m</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span>REM: <strong className="text-white font-mono">{sleepLog.remSleepMinutes}m</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      <span>Light: <strong className="text-white font-mono">{sleepLog.lightSleepMinutes}m</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                      <span>Awake: <strong className="text-white font-mono">{sleepLog.awakeMinutes}m</strong></span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-kaizen-bg border border-kaizen-border text-xs text-kaizen-text-secondary flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <p>
                  Waking up in the middle of Deep Sleep causes <strong>sleep inertia</strong> (morning grogginess). 
                  Target waking up between full 90-minute cycle boundaries for peak alertness and high heart rate variability.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Circadian Bedtime Calculator & History Trend */}
        <div className="space-y-6">
          {/* Circadian Bedtime Planner */}
          <Card
            title="Circadian Bedtime Planner"
            subtitle="Plan tonight's sleep window to eliminate morning grogginess"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-kaizen-text-secondary uppercase tracking-wider mb-1.5">
                  Desired Wake Up Time
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={plannedWakeTime}
                    onChange={e => setPlannedWakeTime(e.target.value)}
                    className="bg-kaizen-bg border-kaizen-border text-white text-base font-mono"
                  />
                  <div className="text-xs text-kaizen-text-muted px-2 py-1 bg-white/5 rounded border border-white/5">
                    +15m latency
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {circadianWindows.map(window => (
                  <div
                    key={window.cycles}
                    className={`p-3 rounded-xl border transition-all ${
                      window.cycles === 5
                        ? 'bg-indigo-950/30 border-indigo-500/40 ring-1 ring-indigo-500/20'
                        : 'bg-kaizen-bg border-kaizen-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        {window.cycles === 5 && <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                        {window.label}
                      </span>
                      <span className="font-mono text-base font-bold text-indigo-300">
                        {window.bedtime}
                      </span>
                    </div>
                    <p className="text-[11px] text-kaizen-text-muted mt-1 leading-snug">{window.desc}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setBedtime(window.bedtime);
                        setWakeTime(plannedWakeTime);
                      }}
                      className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <span>Set as bedtime intention</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* 7-Day Sleep Duration Trend */}
          <Card
            title="7-Day Sleep Duration"
            subtitle="Nightly duration vs 8h baseline target"
          >
            {chartData.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262A36" vertical={false} />
                    <XAxis dataKey="day" stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 11 }} domain={[4, 10]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141721',
                        borderColor: '#262A36',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`${val} hrs`, 'Sleep Duration']}
                    />
                    <ReferenceLine y={8} stroke="#10B981" strokeDasharray="3 3" label={{ value: '8h Target', fill: '#10B981', fontSize: 10, position: 'right' }} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#6366F1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#sleepGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-kaizen-text-muted">
                No sleep history logged in past 7 days.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
