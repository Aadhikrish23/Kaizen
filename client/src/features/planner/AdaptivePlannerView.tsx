import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  TrendingUp,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
  Info,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import {
  useUserPlan,
  useConfigurePlan,
  useAdaptPlan,
  useActivatePlannedDay,
} from '../../services/plannerService';
import { useInventory } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';
import { ExerciseVideoModal } from '../workouts/ExerciseVideoModal';
import { SwapExerciseModal, isExerciseCompatibleWithEquipment } from './SwapExerciseModal';
import { downloadWorkoutPlanPdf } from '../../services/workoutPlanPdfService';
import { PlannedDay, PlannedExercise, PlannerPreferences, Exercise } from '../../types';

interface AdaptivePlannerViewProps {
  currentDate: string;
  onNavigateToWorkouts?: () => void;
}

export const AdaptivePlannerView: React.FC<AdaptivePlannerViewProps> = ({
  currentDate,
  onNavigateToWorkouts,
}) => {
  const { user } = useAuth();
  const { data: plan, isLoading: loadingPlan } = useUserPlan();
  const { data: inventory } = useInventory();

  const { mutateAsync: configurePlan, isPending: isConfiguring } = useConfigurePlan();
  const { mutateAsync: adaptPlan, isPending: isAdapting } = useAdaptPlan();
  const { mutateAsync: activatePlannedDay, isPending: isActivating } = useActivatePlannedDay();

  // Questionnaire / Configurator State
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [splitStyle, setSplitStyle] = useState<'full_body' | 'upper_lower' | 'ppl' | 'home_dumbbell'>('full_body');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [targetFocus, setTargetFocus] = useState<'hypertrophy' | 'strength' | 'fat_loss' | 'general_fitness'>('general_fitness');

  // Interactive Day Selection
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [showGymGuide, setShowGymGuide] = useState(false);
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activationSuccessMessage, setActivationSuccessMessage] = useState<string | null>(null);
  const [adaptSuccessMessage, setAdaptSuccessMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Exercise Swap Modal State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{
    dayNumber: number;
    exerciseIndex: number;
    exercise: PlannedExercise;
  } | null>(null);

  const handleOpenSwapModal = (dayNumber: number, exerciseIndex: number, exercise: PlannedExercise) => {
    setSwapTarget({ dayNumber, exerciseIndex, exercise });
    setIsSwapModalOpen(true);
  };

  const inventoryEquipment = inventory?.equipment || [];
  const hasMismatchedExercises = React.useMemo(() => {
    if (!plan?.schedule || inventoryEquipment.length === 0) return false;
    for (const day of plan.schedule) {
      for (const ex of day.exercises) {
        const mockEx: Exercise = {
          _id: ex.exerciseId || '',
          name: ex.exerciseName,
          targetMuscle: ex.targetMuscle as any,
          equipment: ex.equipment as any,
        };
        if (!isExerciseCompatibleWithEquipment(mockEx, inventoryEquipment)) {
          return true;
        }
      }
    }
    return false;
  }, [plan, inventoryEquipment]);

  // Sync initial preferences when plan loads
  React.useEffect(() => {
    if (plan?.preferences) {
      setDaysPerWeek(plan.preferences.daysPerWeek);
      setDurationMinutes(plan.preferences.sessionDurationMinutes);
      setSplitStyle(plan.preferences.splitStyle);
      setExperienceLevel(plan.preferences.experienceLevel);
      setTargetFocus(plan.preferences.targetFocus);
    }
  }, [plan]);

  if (loadingPlan && !plan) {
    return <LoadingState message="Synthesizing personalized training program..." />;
  }

  const handleGeneratePlan = async () => {
    const preferences: PlannerPreferences = {
      daysPerWeek,
      sessionDurationMinutes: durationMinutes,
      splitStyle,
      experienceLevel,
      targetFocus,
    };
    await configurePlan(preferences);
    setShowConfigurator(false);
    setSelectedDayNumber(1);
  };

  const handleRunDailyAdaptation = async () => {
    try {
      await adaptPlan({ date: currentDate, force: true });
      setAdaptSuccessMessage('Adaptive algorithm evaluated recent performance & updated progression parameters.');
      setTimeout(() => setAdaptSuccessMessage(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivateDay = async (dayNumber: number) => {
    try {
      await activatePlannedDay({ dayNumber, date: currentDate });
      setActivationSuccessMessage(`Day ${dayNumber} successfully loaded into today's Workout Tracker!`);
      setTimeout(() => setActivationSuccessMessage(null), 3000);
      if (onNavigateToWorkouts) {
        setTimeout(onNavigateToWorkouts, 800);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to activate workout');
    }
  };

  const handleExportPdf = () => {
    if (!plan) return;
    try {
      setIsExportingPdf(true);
      const filename = downloadWorkoutPlanPdf({
        plan,
        user,
        equipment: inventoryEquipment,
      });
      setPdfSuccessMessage(`Training blueprint successfully exported as ${filename}`);
      setTimeout(() => setPdfSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to export workout plan to PDF:', err);
      alert('Failed to generate PDF export. Please check console.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenVideo = (planEx: PlannedExercise) => {
    const exObj: Exercise = {
      _id: planEx.exerciseId || `temp-${planEx.exerciseName}`,
      name: planEx.exerciseName,
      targetMuscle: planEx.targetMuscle as any,
      equipment: planEx.equipment as any,
      videoUrl: planEx.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
      formTips: planEx.formTips || [
        'Maintain braced core and aligned spine.',
        'Control eccentric lowering tempo for 2-3 seconds.',
        'Exhale through the concentric exertion.',
      ],
      instructions: planEx.notes || 'Execute repetitions with strict form and full range of motion.',
      difficulty: experienceLevel,
    };
    setActiveVideoExercise(exObj);
    setIsVideoModalOpen(true);
  };

  const schedule = plan?.schedule || [];
  const selectedDay: PlannedDay | undefined = schedule.find((d) => d.dayNumber === selectedDayNumber) || schedule[0];
  const equipmentCount = inventory?.equipment?.length || 0;
  const recentAdaptations = plan?.dailyAdaptations || [];

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-kaizen-border">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-bold tracking-tight text-kaizen-text">Adaptive Workout Planner</h1>
            <Badge variant="violet" size="sm">Self-Improving</Badge>
          </div>
          <p className="text-xs text-kaizen-muted mt-1 font-mono">
            Personalized training blueprint calibrated to your inventory & updated daily based on your logged performance
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf || !plan}
            className="gap-1.5 text-xs text-kaizen-text border-kaizen-border hover:border-emerald-500/50 hover:text-emerald-400"
            title="Export complete weekly training blueprint as PDF"
          >
            <FileDown className={`w-3.5 h-3.5 text-emerald-400 ${isExportingPdf ? 'animate-bounce' : ''}`} />
            {isExportingPdf ? 'Generating PDF...' : 'Export PDF'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunDailyAdaptation}
            disabled={isAdapting}
            className="gap-1.5 text-xs text-emerald-400 border-emerald-500/30 hover:border-emerald-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAdapting ? 'animate-spin' : ''}`} />
            {isAdapting ? 'Analyzing...' : 'Adapt Daily'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowConfigurator(!showConfigurator)}
            className="gap-1.5 text-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showConfigurator ? 'Hide Preferences' : 'Tune Preferences'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {pdfSuccessMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-control font-mono flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {pdfSuccessMessage}
          </span>
        </div>
      )}

      {activationSuccessMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-control font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {activationSuccessMessage}
          </span>
          {onNavigateToWorkouts && (
            <button onClick={onNavigateToWorkouts} className="underline hover:text-emerald-300">
              Open Workouts &rarr;
            </button>
          )}
        </div>
      )}

      {adaptSuccessMessage && (
        <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs rounded-control font-mono flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-400" /> {adaptSuccessMessage}
        </div>
      )}

      {/* Preferences & Questionnaire Drawer / Card */}
      {showConfigurator && (
        <Card className="p-5 bg-kaizen-surface border border-violet-500/30 space-y-5">
          <div className="flex items-center justify-between border-b border-kaizen-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-kaizen-text flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-400" />
                Personalized Training Preferences
              </h3>
              <p className="text-xs text-kaizen-muted font-mono mt-0.5">
                Adjust schedule frequency, session time, experience, and training split
              </p>
            </div>
            <Badge variant="neutral" size="sm">Questionnaire</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Frequency */}
            <div>
              <label className="text-xs font-mono text-kaizen-muted block mb-2 uppercase tracking-wider">
                Workouts Per Week
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDaysPerWeek(num)}
                    className={`py-2 text-xs font-mono rounded-control border transition-colors ${
                      daysPerWeek === num
                        ? 'bg-violet-500/20 border-violet-500 text-violet-300 font-bold'
                        : 'bg-kaizen-bg border-kaizen-border text-kaizen-muted hover:text-kaizen-text'
                    }`}
                  >
                    {num} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Session Duration */}
            <div>
              <label className="text-xs font-mono text-kaizen-muted block mb-2 uppercase tracking-wider">
                Session Duration
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[30, 45, 60, 75, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2 text-xs font-mono rounded-control border transition-colors ${
                      durationMinutes === mins
                        ? 'bg-violet-500/20 border-violet-500 text-violet-300 font-bold'
                        : 'bg-kaizen-bg border-kaizen-border text-kaizen-muted hover:text-kaizen-text'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Split Style */}
            <div>
              <label className="text-xs font-mono text-kaizen-muted block mb-2 uppercase tracking-wider">
                Training Split Architecture
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'full_body', label: 'Full Body', desc: 'Compound total body routines' },
                  { id: 'upper_lower', label: 'Upper / Lower', desc: 'Torso and lower body alternating' },
                  { id: 'ppl', label: 'Push / Pull / Legs', desc: 'Dedicated movement pattern days' },
                  { id: 'home_dumbbell', label: 'Home Dumbbells', desc: 'Optimized for home setups' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSplitStyle(s.id as any)}
                    className={`p-2.5 text-left rounded-control border transition-colors ${
                      splitStyle === s.id
                        ? 'bg-violet-500/20 border-violet-500 text-kaizen-text font-semibold'
                        : 'bg-kaizen-bg border-kaizen-border text-kaizen-muted hover:text-kaizen-text'
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] text-kaizen-muted mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Focus */}
            <div>
              <label className="text-xs font-mono text-kaizen-muted block mb-2 uppercase tracking-wider">
                Primary Goal Focus
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'hypertrophy', label: 'Hypertrophy', desc: '8-12 reps, muscle growth' },
                  { id: 'strength', label: 'Raw Strength', desc: '4-6 reps, heavy compound focus' },
                  { id: 'fat_loss', label: 'Fat Loss / Circuit', desc: '12-15 reps, conditioning' },
                  { id: 'general_fitness', label: 'General Fitness', desc: 'Balanced health & posture' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTargetFocus(f.id as any)}
                    className={`p-2.5 text-left rounded-control border transition-colors ${
                      targetFocus === f.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-kaizen-text font-semibold'
                        : 'bg-kaizen-bg border-kaizen-border text-kaizen-muted hover:text-kaizen-text'
                    }`}
                  >
                    <div className="text-xs font-bold">{f.label}</div>
                    <div className="text-[10px] text-kaizen-muted mt-0.5">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Profile & Inventory calibration note */}
          <div className="p-3 bg-kaizen-bg border border-kaizen-border rounded-control flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-kaizen-muted">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-violet-400 shrink-0" />
              Synced with profile: <strong>{user?.currentWeightKg || 70}kg</strong> • {user?.goal || 'General Health'} • <strong>{equipmentCount} equipment items</strong> available.
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGeneratePlan}
              disabled={isConfiguring}
              className="gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isConfiguring ? 'Synthesizing...' : 'Generate Personalized Plan'}
            </Button>
          </div>
        </Card>
      )}

      {/* Program Blueprint Summary Card */}
      <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-kaizen-text">
              {plan?.preferences.splitStyle.replace('_', ' ').toUpperCase()} Program
            </h3>
            <Badge variant="emerald" size="sm" className="capitalize">
              {plan?.preferences.targetFocus.replace('_', ' ')}
            </Badge>
            <Badge variant="neutral" size="sm" className="capitalize">
              {plan?.preferences.experienceLevel}
            </Badge>
          </div>
          <p className="text-xs text-kaizen-muted font-mono flex items-center gap-2">
            <span>{plan?.preferences.daysPerWeek} training days/week</span>
            <span>•</span>
            <span>{plan?.preferences.sessionDurationMinutes} min sessions</span>
            <span>•</span>
            <span>Calibrated to {equipmentCount} inventory items</span>
          </p>
        </div>

        {/* Daily Adaptation Engine Status */}
        <div className="flex items-center gap-3 bg-kaizen-bg border border-kaizen-border p-2.5 rounded-control">
          <div className="w-8 h-8 rounded-control bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase text-kaizen-subtle tracking-wider">Adaptation Status</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-xs font-mono font-bold text-kaizen-text block">
              {recentAdaptations.length > 0 ? recentAdaptations[0].type.replace('_', ' ').toUpperCase() : 'OPTIMIZED'}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Adaptation Explanation Alert (Self-improving daily loop) */}
      {recentAdaptations.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-violet-950/30 to-emerald-950/20 border border-violet-500/30 rounded-structural space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-kaizen-text">Daily Adaptation Intelligence: Why Your Plan Updated</span>
            </div>
            <span className="text-[10px] font-mono text-kaizen-muted">{recentAdaptations[0].date}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            {recentAdaptations[0].reason}
          </p>
          {recentAdaptations[0].oldValue && recentAdaptations[0].newValue && (
            <div className="text-[11px] font-mono text-emerald-400 pt-1 flex items-center gap-2">
              <span>{recentAdaptations[0].exerciseName}:</span>
              <span className="line-through text-kaizen-muted">{recentAdaptations[0].oldValue}</span>
              <span>&rarr;</span>
              <strong className="text-emerald-300">{recentAdaptations[0].newValue}</strong>
            </div>
          )}
        </div>
      )}

      {/* Equipment Mismatch Banner */}
      {hasMismatchedExercises && (
        <Card className="p-4 bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                Equipment Arsenal Mismatch Detected
              </h4>
              <p className="text-xs text-amber-200/80 font-mono mt-0.5">
                Some movements in your active program require equipment (e.g. workout bench or dip station) not configured in your inventory. Re-align to automatically generate bench-free & bodyweight movements.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGeneratePlan}
            disabled={isConfiguring}
            className="bg-amber-500 hover:bg-amber-400 text-black border-none gap-1.5 shrink-0 text-xs font-bold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isConfiguring ? 'Re-aligning...' : 'Re-align Program to Inventory'}
          </Button>
        </Card>
      )}

      {/* 7-Day Interactive Week Schedule Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-kaizen-primary" /> 7-Day Training Schedule
          </span>
          <span className="text-[11px] text-kaizen-subtle font-mono">Click a day to view planned routine</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {schedule.map((day) => {
            const isSelected = day.dayNumber === selectedDayNumber;
            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => setSelectedDayNumber(day.dayNumber)}
                className={`p-3 text-left rounded-structural border transition-all ${
                  isSelected
                    ? 'bg-kaizen-surface border-kaizen-primary shadow-lg ring-1 ring-kaizen-primary/30'
                    : 'bg-kaizen-surface/60 border-kaizen-border hover:border-kaizen-border/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-kaizen-subtle uppercase">
                    Day {day.dayNumber}
                  </span>
                  {day.isRestDay ? (
                    <Badge variant="neutral" size="sm">Rest</Badge>
                  ) : (
                    <Badge variant="emerald" size="sm">Workout</Badge>
                  )}
                </div>
                <div className="text-xs font-bold text-kaizen-text truncate">{day.dayName}</div>
                <div className="text-[11px] text-kaizen-muted mt-1 truncate">
                  {day.isRestDay ? 'Recovery' : `${day.exercises.length} movements`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Routine Detail View */}
      {selectedDay && (
        <Card className="p-5 bg-kaizen-surface border border-kaizen-border space-y-5">
          {/* Day Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-kaizen-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-kaizen-subtle uppercase">
                  {selectedDay.dayName} • Day {selectedDay.dayNumber}
                </span>
                {selectedDay.isRestDay ? (
                  <Badge variant="neutral" size="sm">Recovery Day</Badge>
                ) : (
                  <Badge variant="emerald" size="sm">{selectedDay.estimatedDurationMinutes} Mins</Badge>
                )}
              </div>
              <h2 className="text-lg font-bold text-kaizen-text mt-1">{selectedDay.title}</h2>
              <p className="text-xs text-kaizen-muted mt-0.5">{selectedDay.focus}</p>
            </div>

            {!selectedDay.isRestDay && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleActivateDay(selectedDay.dayNumber)}
                disabled={isActivating}
                className="gap-1.5 shrink-0"
              >
                <Zap className="w-4 h-4" />
                {isActivating ? 'Pushing...' : "Push to Today's Workout Tracker"}
              </Button>
            )}
          </div>

          {/* If Rest Day */}
          {selectedDay.isRestDay ? (
            <div className="p-8 text-center bg-kaizen-bg border border-kaizen-border rounded-control space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-75" />
              <h4 className="text-sm font-bold text-kaizen-text">Scheduled Recovery & Neuromuscular Rest</h4>
              <p className="text-xs text-kaizen-muted max-w-md mx-auto">
                Muscle tissue regenerates during sleep and active recovery. Hydrate, replenish amino acids and glycogen, and perform light mobility stretching.
              </p>
            </div>
          ) : (
            /* Planned Movements List */
            <div className="space-y-3">
              <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider block">
                Target Movements ({selectedDay.exercises.length} Exercises)
              </span>

              <div className="grid grid-cols-1 gap-3">
                {selectedDay.exercises.map((ex, idx) => {
                  const isExCompatible = isExerciseCompatibleWithEquipment(
                    {
                      _id: ex.exerciseId || '',
                      name: ex.exerciseName,
                      targetMuscle: ex.targetMuscle as any,
                      equipment: ex.equipment as any,
                    },
                    inventoryEquipment
                  );

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-structural border transition-colors space-y-3 ${
                        isExCompatible
                          ? 'bg-kaizen-bg border-kaizen-border hover:border-kaizen-border/80'
                          : 'bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-control bg-kaizen-surface border border-kaizen-border flex items-center justify-center text-xs font-mono text-kaizen-muted font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-kaizen-text">{ex.exerciseName}</h4>
                              {!isExCompatible && (
                                <Badge variant="amber" size="sm" className="text-[10px]">
                                  Hardware Missing
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="cyan" size="sm" className="capitalize">
                                {ex.targetMuscle}
                              </Badge>
                              <Badge variant="neutral" size="sm" className="capitalize">
                                {ex.equipment}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                          {/* Sets / Reps / Weight Stats */}
                          <div className="text-left sm:text-right">
                            <div className="text-xs font-mono text-kaizen-muted">
                              Target: <strong className="text-kaizen-text">{ex.targetSets} sets × {ex.targetReps} reps</strong>
                            </div>
                            <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                              Suggested Load: {ex.suggestedWeightKg} kg
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Video Demo Button */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenVideo(ex)}
                              className="gap-1.5 text-xs text-emerald-400 border-emerald-500/30 hover:border-emerald-500"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Demo Video
                            </Button>

                            {/* Swap Exercise Movement Button */}
                            <Button
                              variant={isExCompatible ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => handleOpenSwapModal(selectedDay.dayNumber, idx, ex)}
                              className={`gap-1.5 text-xs ${
                                isExCompatible
                                  ? 'text-kaizen-muted hover:text-kaizen-text border-kaizen-border hover:border-kaizen-border/80'
                                  : 'bg-amber-500 hover:bg-amber-400 text-black border-none font-bold'
                              }`}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isExCompatible ? 'text-violet-400' : 'text-black'}`} />
                              Swap Movement
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Warning notice if movement requires unconfigured equipment */}
                      {!isExCompatible && (
                        <div className="p-2.5 rounded-control bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-300 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>This exercise requires equipment not in your inventory. Click "Swap Movement" to choose a compatible alternative.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenSwapModal(selectedDay.dayNumber, idx, ex)}
                            className="underline font-bold text-amber-200 hover:text-white shrink-0 ml-2"
                          >
                            Swap Now &rarr;
                          </button>
                        </div>
                      )}

                      {/* Form tips bullet checkpoints */}
                      {ex.formTips && ex.formTips.length > 0 && (
                        <div className="pt-2 border-t border-kaizen-border/60">
                          <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider block mb-1">
                            Technique Checkpoints:
                          </span>
                          <ul className="space-y-0.5">
                            {ex.formTips.slice(0, 3).map((tip, tipIdx) => (
                              <li key={tipIdx} className="text-xs text-kaizen-muted flex items-start gap-1.5 font-mono">
                                <span className="text-emerald-400 font-bold text-[11px] mt-0.5">✓</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Gym 101 Beginner Guide (Collapsible) */}
      <div className="border border-kaizen-border rounded-structural bg-kaizen-surface/60 overflow-hidden">
        <button
          onClick={() => setShowGymGuide(!showGymGuide)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-kaizen-surface transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-kaizen-text">Gym & Training 101: Foundation Principles</span>
            <Badge variant="neutral" size="sm">Beginner Primer</Badge>
          </div>
          {showGymGuide ? <ChevronUp className="w-4 h-4 text-kaizen-muted" /> : <ChevronDown className="w-4 h-4 text-kaizen-muted" />}
        </button>

        {showGymGuide && (
          <div className="p-4 pt-0 border-t border-kaizen-border/60 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-kaizen-bg border border-kaizen-border rounded-control">
              <h5 className="text-xs font-bold text-kaizen-text mb-1">1. Progressive Overload</h5>
              <p className="text-[11px] text-kaizen-muted leading-relaxed font-mono">
                The golden law of muscle growth. Always strive to add +1 rep or +1.5kg once a target rep range feels comfortable (RPE ≤ 7.5).
              </p>
            </div>
            <div className="p-3 bg-kaizen-bg border border-kaizen-border rounded-control">
              <h5 className="text-xs font-bold text-kaizen-text mb-1">2. Understanding RPE (1-10)</h5>
              <p className="text-[11px] text-kaizen-muted leading-relaxed font-mono">
                Rate of Perceived Exertion. RPE 7 means you had 3 reps left in reserve. RPE 8 means 2 reps in reserve. Train mostly in the 7-8.5 zone.
              </p>
            </div>
            <div className="p-3 bg-kaizen-bg border border-kaizen-border rounded-control">
              <h5 className="text-xs font-bold text-kaizen-text mb-1">3. Controlled Eccentric Cadence</h5>
              <p className="text-[11px] text-kaizen-muted leading-relaxed font-mono">
                Lower weights under control (2 to 3 seconds down), pause briefly, then push explosively. Do not use momentum or swing weights.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video Demonstration Modal */}
      <ExerciseVideoModal
        exercise={activeVideoExercise}
        isOpen={isVideoModalOpen}
        onClose={() => {
          setIsVideoModalOpen(false);
          setActiveVideoExercise(null);
        }}
        onAddToWorkout={(_ex) => {
          setIsVideoModalOpen(false);
        }}
      />

      {/* Exercise Swap Modal */}
      {isSwapModalOpen && swapTarget && (
        <SwapExerciseModal
          isOpen={isSwapModalOpen}
          onClose={() => {
            setIsSwapModalOpen(false);
            setSwapTarget(null);
          }}
          dayNumber={swapTarget.dayNumber}
          exerciseIndex={swapTarget.exerciseIndex}
          currentExercise={swapTarget.exercise}
          equipmentList={inventoryEquipment}
        />
      )}
    </div>
  );
};
