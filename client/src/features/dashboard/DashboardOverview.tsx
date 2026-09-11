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
    <div className="space-y-6">
      {/* Top Banner: Date & Day Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-kaizen-surface border border-kaizen-border rounded-structural">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-kaizen-primary" />
            <span className="text-xs font-mono uppercase tracking-wider text-kaizen-muted">Kaizen Daily Overview</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-kaizen-text">
            {new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={strength?.workoutCompleted ? 'emerald' : 'neutral'} size="md">
            {strength?.workoutCompleted ? 'Workout Logged' : 'Workout Pending'}
          </Badge>
          <Badge variant={sleep?.logged ? 'cyan' : 'neutral'} size="md">
            {sleep?.logged ? `Sleep: ${Math.floor(sleep.durationMinutes / 60)}h` : 'Sleep Unlogged'}
          </Badge>
          <Button variant="secondary" size="sm" onClick={() => onNavigateTab('analytics')} className="ml-2 hidden sm:flex">
            View Analytics
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-control">
          {(error as Error).message || 'Failed to load summary'}
        </div>
      )}

      {/* 6 Core Pillars Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Pillar 1: Strength & Training */}
        <Card
          title="Strength & Workout"
          subtitle={strength?.splitName || 'No session logged yet'}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('workouts')}>
              Track <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-kaizen-workout">
                  {strength?.totalVolumeKg.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">kg lifted</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1 font-mono">
                {strength?.exercisesCount || 0} exercises recorded
              </p>
            </div>
            <div className="w-12 h-12 rounded-control bg-kaizen-workout/10 border border-kaizen-workout/20 flex items-center justify-center text-kaizen-workout">
              <Dumbbell className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 2: Nutrition & Calories */}
        <Card
          title="Nutrition & Energy"
          subtitle={`Calorie Target: ${nutrition?.calorieGoal || 2200} kcal`}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('meals')}>
              Log <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-2">
            <div className="w-full mr-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold font-mono text-kaizen-calories">
                  {nutrition?.totalCalories.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">/ {nutrition?.calorieGoal || 2200} kcal</span>
              </div>
              <div className="w-full h-2 bg-kaizen-border rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-kaizen-calories transition-all duration-500"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs font-mono text-kaizen-muted">
                <span>P: <strong className="text-kaizen-text">{nutrition?.totalProtein || 0}g</strong></span>
                <span>C: <strong className="text-kaizen-text">{nutrition?.totalCarbs || 0}g</strong></span>
                <span>F: <strong className="text-kaizen-text">{nutrition?.totalFat || 0}g</strong></span>
              </div>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-kaizen-calories/10 border border-kaizen-calories/20 flex items-center justify-center text-kaizen-calories">
              <Utensils className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 3: Hydration */}
        <Card
          title="Hydration Intake"
          subtitle={`Daily Goal: ${hydration?.waterGoal || 2500} ml`}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('water')}>
              Add <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-kaizen-water">
                  {hydration?.totalWater.toLocaleString() || '0'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">/ {hydration?.waterGoal || 2500} ml</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1 font-mono">
                {hydration?.logs.length || 0} entries logged today
              </p>
            </div>
            <ProgressRing
              value={hydration?.totalWater || 0}
              max={hydration?.waterGoal || 2500}
              size={70}
              strokeWidth={6}
              colorClass="text-kaizen-water"
            />
          </div>
        </Card>

        {/* Pillar 4: Sleep Cycle & Circadian Reset */}
        <Card
          title="Sleep & Circadian"
          subtitle={sleep?.logged ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m recorded` : 'No sleep logged yet'}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('sleep')}>
              Track <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-indigo-400">
                  {sleep?.logged ? `${Math.floor(sleep.durationMinutes / 60)}h ${sleep.durationMinutes % 60}m` : '--'}
                </span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1 font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {sleep?.logged
                    ? `${sleep.cyclesCount} cycles • Score: ${sleep.recoveryScore}`
                    : 'Target: 5 cycles (7.5h)'}
                </span>
              </p>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Moon className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 5: Scale Weight (Quick Weigh-In Modal) */}
        <Card
          title="Scale Weight"
          subtitle={`Target: ${bodyMetrics?.targetWeight || '--'} kg`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setIsWeighInOpen(true)}>
              Weigh-In <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-kaizen-weight">
                  {bodyMetrics?.weight ? bodyMetrics.weight.toFixed(1) : '--'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">kg</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1 font-mono">
                {bodyMetrics?.weight ? 'Logged for today' : 'Tap Weigh-In to record'}
              </p>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-kaizen-weight/10 border border-kaizen-weight/20 flex items-center justify-center text-kaizen-weight">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Pillar 6: Kaizen Health Score */}
        <Card
          title="Kaizen Health Score"
          subtitle="Holistic adherence index"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('analytics')}>
              View <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-emerald-400">
                  {Math.round(
                    ((caloriePercent > 0 ? Math.min(100, caloriePercent) : 50) +
                     (hydration ? Math.min(100, (hydration.totalWater / hydration.waterGoal) * 100) : 50) +
                     (strength?.workoutCompleted ? 100 : 40) +
                     (sleep?.logged ? sleep.recoveryScore : 60)) / 4
                  )}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">/ 100</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1 font-mono">
                Level 1 • High Readiness
              </p>
            </div>
            <div className="w-12 h-12 shrink-0 rounded-control bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
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
