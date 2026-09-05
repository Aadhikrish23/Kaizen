import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { LoadingState } from '../../components/ui/LoadingState';
import { useSummary } from '../../services/summaryService';
import { DailySummary } from '../../types';
import { Dumbbell, Utensils, Scale, ArrowRight, Activity } from 'lucide-react';

interface DashboardOverviewProps {
  currentDate: string;
  onNavigateTab: (tab: 'workouts' | 'meals' | 'water' | 'weight') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ currentDate, onNavigateTab }) => {
  const { data, isLoading, error } = useSummary(currentDate);
  const summary = data as unknown as DailySummary;

  if (isLoading && !summary) {
    return <LoadingState message="Loading daily summary metrics..." />;
  }

  const nutrition = summary?.nutrition;
  const hydration = summary?.hydration;
  const bodyMetrics = summary?.bodyMetrics;
  const strength = summary?.strength;

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
          <Badge variant={hydration && hydration.totalWater >= hydration.waterGoal ? 'cyan' : 'neutral'} size="md">
            {hydration && hydration.totalWater >= hydration.waterGoal ? 'Hydrated' : 'Water Incomplete'}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-control">
          {(error as Error).message || 'Failed to load summary'}
        </div>
      )}

      {/* 4 Pillars Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

        {/* Pillar 4: Body Weight */}
        <Card
          title="Scale Weight"
          subtitle={`Target: ${bodyMetrics?.targetWeight || 72} kg`}
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('weight')}>
              Weigh <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          }
        >
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-kaizen-weight">
                  {bodyMetrics?.weight ? bodyMetrics.weight.toFixed(1) : '--'}
                </span>
                <span className="text-xs font-mono text-kaizen-muted">kg</span>
              </div>
              <p className="text-xs text-kaizen-muted mt-1 font-mono">
                {bodyMetrics?.weight
                  ? `Goal delta: ${(bodyMetrics.weight - (bodyMetrics.targetWeight || 72)) > 0 ? '+' : ''}${(bodyMetrics.weight - (bodyMetrics.targetWeight || 72)).toFixed(1)} kg`
                  : 'No weigh-in logged today'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-control bg-kaizen-weight/10 border border-kaizen-weight/20 flex items-center justify-center text-kaizen-weight">
              <Scale className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
