import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { LoadingState } from '../../components/ui/LoadingState';
import { useSummary } from '../../services/summaryService';
import { DailySummary } from '../../types';
import { Dumbbell, Utensils, Scale, Moon, ArrowRight, Activity, Zap } from 'lucide-react';
import { QuickWeighInModal } from '../weight/QuickWeighInModal';
import { AICoach } from './AICoach';

interface DashboardOverviewProps {
  currentDate: string;
  onNavigateTab: (tab: 'workouts' | 'meals' | 'water' | 'sleep' | 'weight' | 'analytics') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ currentDate, onNavigateTab }) => {
  const [isWeighInOpen, setIsWeighInOpen] = useState(false);
  const { data, isLoading, error } = useSummary(currentDate);
  const summary = data as unknown as DailySummary;

  if (isLoading && !summary) {
    return <LoadingState message="Loading daily summary metrics..." />;
  }

  const nutrition = summary?.nutrition;
  const hydration = summary?.hydration;
  const bodyMetrics = summary?.bodyMetrics;
  const strength = summary?.strength;
  const sleep = summary?.sleep;

  const caloriePercent = nutrition ? Math.min(100, Math.round((nutrition.totalCalories / nutrition.calorieGoal) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Date & Performance Status */}
      <div className="relative overflow-hidden p-5 sm:p-6 bg-kaizen-surface border border-kaizen-border rounded-structural shadow-subtle card-sheen">
        <div className="absolute top-0 right-0 w-72 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                <Activity className="w-3 h-3 text-emerald-400" />
                Live Telemetry
              </span>
              <span className="text-xs font-mono text-kaizen-subtle uppercase tracking-wider">
                {new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white">
              {new Date(currentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={strength?.workoutCompleted ? 'emerald' : 'neutral'} size="md">
              <span className="w-1.5 h-1.5 rounded-full bg-current inline-block mr-1"></span>
              {strength?.workoutCompleted ? 'Session Complete' : 'Session Pending'}
            </Badge>
            <Badge variant={sleep?.logged ? 'indigo' : 'neutral'} size="md">
              {sleep?.logged ? `Rest: ${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m` : 'Sleep Unlogged'}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab('analytics')}
              className="font-mono text-xs hidden sm:flex items-center gap-1.5"
            >
              Analytics Hub
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-control">
          {(error as Error).message || 'Failed to load summary'}
        </div>
      )}

      {/* 6 Core Pillars Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Pillar 1: Strength & Training */}
        <Card
          title="Strength & Training"
          subtitle={strength?.splitName || 'No session logged today'}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('workouts')} className="text-rose-400 hover:text-rose-300">
              Track <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-rose-400">
                  {strength?.totalVolumeKg.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted uppercase">kg total</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1.5 font-mono flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-rose-400 inline-block"></span>
                {strength?.exercisesCount || 0} exercises recorded
              </p>
            </div>
            <div className="w-12 h-12 rounded-control bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-sm">
              <Dumbbell className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 2: Nutrition & Energy */}
        <Card
          title="Nutrition & Energy"
          subtitle={`Daily Target: ${nutrition?.calorieGoal || 2200} kcal`}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('meals')} className="text-amber-400 hover:text-amber-300">
              Log <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-2">
            <div className="w-full mr-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-amber-400">
                  {nutrition?.totalCalories.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">/ {nutrition?.calorieGoal || 2200} kcal</span>
              </div>
              <div className="w-full h-2 bg-kaizen-bg rounded-full overflow-hidden mb-2.5 border border-kaizen-border">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
              <div className="flex gap-3 text-xs font-mono text-kaizen-muted">
                <span className="bg-kaizen-bg px-1.5 py-0.5 rounded border border-kaizen-border/80">P: <strong className="text-white">{nutrition?.totalProtein || 0}g</strong></span>
                <span className="bg-kaizen-bg px-1.5 py-0.5 rounded border border-kaizen-border/80">C: <strong className="text-white">{nutrition?.totalCarbs || 0}g</strong></span>
                <span className="bg-kaizen-bg px-1.5 py-0.5 rounded border border-kaizen-border/80">F: <strong className="text-white">{nutrition?.totalFat || 0}g</strong></span>
              </div>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm">
              <Utensils className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 3: Hydration Intake */}
        <Card
          title="Hydration Level"
          subtitle={`Hydration Target: ${hydration?.waterGoal || 2500} ml`}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('water')} className="text-cyan-400 hover:text-cyan-300">
              Add <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-cyan-400">
                  {hydration?.totalWater.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">/ {hydration?.waterGoal || 2500} ml</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1.5 font-mono flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-400 inline-block"></span>
                {hydration?.logs.length || 0} logs recorded today
              </p>
            </div>
            <ProgressRing
              value={hydration?.totalWater || 0}
              max={hydration?.waterGoal || 2500}
              size={68}
              strokeWidth={6}
              colorClass="text-cyan-400"
            />
          </div>
        </Card>

        {/* Pillar 4: Sleep Cycle & Circadian Reset */}
        <Card
          title="Sleep & Circadian"
          subtitle={sleep?.logged ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m recorded` : 'No sleep logged yet'}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('sleep')} className="text-indigo-400 hover:text-indigo-300">
              Track <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-indigo-400">
                  {sleep?.logged ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m` : '--'}
                </span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1.5 font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {sleep?.logged
                    ? `${sleep.cyclesCount} cycles • Score: ${sleep.recoveryScore}`
                    : 'Goal: 5 full cycles (7.5h)'}
                </span>
              </p>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm">
              <Moon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 5: Scale Weight */}
        <Card
          title="Scale Weight"
          subtitle={`Target Goal: ${bodyMetrics?.targetWeight || '--'} kg`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setIsWeighInOpen(true)} className="text-violet-400 hover:text-violet-300">
              Weigh-In <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-violet-400">
                  {bodyMetrics?.weight ? bodyMetrics.weight.toFixed(1) : '--'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">kg</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1.5 font-mono flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-violet-400 inline-block"></span>
                {bodyMetrics?.weight ? 'Logged for today' : 'Tap Weigh-In to record'}
              </p>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-sm">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 6: Kaizen Health Score */}
        <Card
          title="Kaizen Readiness"
          subtitle="Holistic adherence index"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('analytics')} className="text-emerald-400 hover:text-emerald-300">
              Review <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400">
                  {Math.round(
                    ((caloriePercent > 0 ? Math.min(100, caloriePercent) : 50) +
                     (hydration ? Math.min(100, (hydration.totalWater / hydration.waterGoal) * 100) : 50) +
                     (strength?.workoutCompleted ? 100 : 40) +
                     (sleep?.logged ? sleep.recoveryScore : 60)) / 4
                  )}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">/ 100</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1.5 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                Prime Condition • Tier 1
              </p>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* AI Coach Assistant */}
      <div className="w-full">
        <AICoach />
      </div>

      {/* Quick Weigh-In Modal */}
      <QuickWeighInModal
        isOpen={isWeighInOpen}
        onClose={() => setIsWeighInOpen(false)}
        defaultDate={currentDate}
      />
    </div>
  );
};
