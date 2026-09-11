import React, { useState } from 'react';
import {
  Calendar,
  Dumbbell,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileDown,
  Plus,
  Trash2,
  ArrowRightLeft,
  Check,
  Pencil,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import {
  useUserPlan,
  useConfigurePlan,
  useActivatePlannedDay,
  useRemoveExerciseFromPlanDay,
  useDeletePlan,
  useSaveCustomPlan,
} from '../../services/plannerService';
import { useInventory } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';
import { ExerciseVideoModal } from '../workouts/ExerciseVideoModal';
import { SwapExerciseModal } from './SwapExerciseModal';
import { AddExerciseToDayModal } from './AddExerciseToDayModal';
import { CustomPlanBuilderModal } from './CustomPlanBuilderModal';
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
  const { mutateAsync: activatePlannedDay, isPending: isActivating } = useActivatePlannedDay();
  const { mutateAsync: removeExerciseFromDay } = useRemoveExerciseFromPlanDay();

  // Modals state
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<'create' | 'edit'>('create');
  const [builderInitialDay, setBuilderInitialDay] = useState(0);
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(false);
  const [confirmClearDay, setConfirmClearDay] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);

  const { mutateAsync: deletePlanMutation, isPending: isDeletingPlan } = useDeletePlan();
  const { mutateAsync: saveCustomPlan } = useSaveCustomPlan();

  // Inline day editing state
  const [isEditingDayInline, setIsEditingDayInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineFocus, setInlineFocus] = useState('');

  // Preference tuning state
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [splitStyle, setSplitStyle] = useState<'full_body' | 'upper_lower' | 'ppl' | 'home_dumbbell'>('full_body');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [targetFocus, setTargetFocus] = useState<'hypertrophy' | 'strength' | 'fat_loss' | 'general_fitness'>('general_fitness');

  // Active day selection
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [expandedTipsIndex, setExpandedTipsIndex] = useState<number | null>(null);

  // Video and Swap Modals
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{
    dayNumber: number;
    exerciseIndex: number;
    exercise: PlannedExercise;
  } | null>(null);

  // Status feedback
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sync initial preferences
  React.useEffect(() => {
    if (plan?.preferences) {
      setDaysPerWeek(plan.preferences.daysPerWeek);
      setDurationMinutes(plan.preferences.sessionDurationMinutes);
      setSplitStyle(plan.preferences.splitStyle);
      setExperienceLevel(plan.preferences.experienceLevel);
      setTargetFocus(plan.preferences.targetFocus);
    }
  }, [plan]);

  const schedule = plan?.schedule || [];
  const selectedDay: PlannedDay | undefined = schedule.find((d) => d.dayNumber === selectedDayNumber) || schedule[0];
  const inventoryEquipment = inventory?.equipment || [];

  if (loadingPlan && !plan) {
    return <LoadingState message="Loading your workout routine..." />;
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
    setActionNotice('Training program updated with new preferences.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleActivateDay = async (dayNumber: number) => {
    try {
      await activatePlannedDay({ dayNumber, date: currentDate });
      setActionNotice(`Day ${dayNumber} loaded into today's session.`);
      setTimeout(() => setActionNotice(null), 2500);
      if (onNavigateToWorkouts) {
        setTimeout(onNavigateToWorkouts, 600);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to activate workout');
    }
  };

  const handleRemoveExercise = async (dayNumber: number, exerciseIndex: number) => {
    try {
      await removeExerciseFromDay({ dayNumber, exerciseIndex });
      setActionNotice('Exercise removed from routine.');
      setTimeout(() => setActionNotice(null), 2500);
    } catch (err) {
      console.error('Failed to remove exercise', err);
    }
  };

  const handleOpenSwapModal = (dayNumber: number, exerciseIndex: number, exercise: PlannedExercise) => {
    setSwapTarget({ dayNumber, exerciseIndex, exercise });
    setIsSwapModalOpen(true);
  };

  const handleOpenVideo = (planEx: PlannedExercise) => {
    const exObj: Exercise = {
      _id: planEx.exerciseId || `temp-${planEx.exerciseName}`,
      name: planEx.exerciseName,
      targetMuscle: planEx.targetMuscle as any,
      equipment: planEx.equipment as any,
      videoUrl: planEx.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
      formTips: planEx.formTips || ['Maintain braced core and aligned spine.'],
      instructions: planEx.notes || 'Execute repetitions with strict form and full range of motion.',
      difficulty: experienceLevel,
    };
    setActiveVideoExercise(exObj);
    setIsVideoModalOpen(true);
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
      setActionNotice(`Exported ${filename}`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF export.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveDayInline = async () => {
    if (!plan || !selectedDay) return;
    try {
      const updatedSchedule = plan.schedule.map(d => {
        if (d.dayNumber === selectedDay.dayNumber) {
          return {
            ...d,
            title: inlineTitle.trim() || d.title,
            focus: inlineFocus.trim() || d.focus,
          };
        }
        return d;
      });
      await saveCustomPlan({
        programName: plan.programName || 'Custom Split',
        daysPerWeek: updatedSchedule.filter(d => !d.isRestDay).length,
        schedule: updatedSchedule,
      });
      setIsEditingDayInline(false);
      setActionNotice('Day details saved.');
      setTimeout(() => setActionNotice(null), 2500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save changes');
    }
  };

  const handleClearCurrentDay = async (dayNumber: number) => {
    if (!plan) return;
    try {
      const updatedSchedule = plan.schedule.map(d => {
        if (d.dayNumber === dayNumber) {
          return {
            ...d,
            exercises: [],
            isRestDay: true,
            estimatedDurationMinutes: 0,
            title: 'Rest & Recovery',
            focus: 'Scheduled Rest & Soft Tissue Recovery',
          };
        }
        return d;
      });
      await saveCustomPlan({
        programName: plan.programName || 'Custom Split',
        daysPerWeek: updatedSchedule.filter(d => !d.isRestDay).length,
        schedule: updatedSchedule,
      });
      setConfirmClearDay(false);
      setActionNotice(`Day ${dayNumber} cleared.`);
      setTimeout(() => setActionNotice(null), 2500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to clear day');
    }
  };

  const handleDeleteOrResetPlan = async () => {
    if (!confirmDeletePlan) {
      setConfirmDeletePlan(true);
      setTimeout(() => setConfirmDeletePlan(false), 4000);
      return;
    }
    try {
      await deletePlanMutation();
      setConfirmDeletePlan(false);
      setActionNotice('Workout plan reset to default inventory schedule.');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reset plan');
    }
  };

  // Sync inline edit state when active day changes
  React.useEffect(() => {
    if (selectedDay) {
      setInlineTitle(selectedDay.title);
      setInlineFocus(selectedDay.focus);
      setIsEditingDayInline(false);
      setConfirmClearDay(false);
      setConfirmDeletePlan(false);
    }
  }, [selectedDayNumber, plan]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Clean, Human Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kaizen-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Dumbbell className="w-5 h-5 text-kaizen-primary" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Workout Planner
            </h1>
            {plan?.programName && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {plan.programName}
              </span>
            )}
            {plan?.isCustomPlan ? (
              <Badge variant="emerald" size="sm">
                Custom Plan
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Preset Routine
              </Badge>
            )}
            <Badge variant="neutral" size="sm">
              {plan?.preferences?.daysPerWeek || schedule.filter(d => !d.isRestDay).length || 3} Days / Week
            </Badge>
          </div>
          <p className="text-xs text-kaizen-text-secondary mt-1">
            Weekly split matched to your equipment inventory. Customize days or assemble your own routines.
          </p>
        </div>

        {/* Exactly 3 Top Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf || !plan}
            className="gap-1.5 text-xs text-kaizen-text border-kaizen-border hover:text-white"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            Export PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBuilderMode('create');
              setBuilderInitialDay(0);
              setIsCustomBuilderOpen(true);
            }}
            className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 hover:border-emerald-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Custom Plan
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfigurator(!showConfigurator)}
            className="gap-1.5 text-xs text-kaizen-text-secondary hover:text-white"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showConfigurator ? 'Close Presets' : 'Plan Settings (Generate Plan)'}
          </Button>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Optional Preset Tuning Accordion */}
      {showConfigurator && (
        <Card
          title="Plan Generator & Presets"
          subtitle="Generate a structured weekly split based on standard training science"
        >
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-kaizen-text-muted uppercase mb-1.5">
                  Training Frequency
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[2, 3, 4, 5, 6].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysPerWeek(d)}
                      className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                        daysPerWeek === d
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                          : 'bg-kaizen-bg border-kaizen-border text-kaizen-text-muted hover:text-white'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-kaizen-text-muted uppercase mb-1.5">
                  Split Style
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'home_dumbbell', label: 'Home Dumbbell' },
                    { id: 'full_body', label: 'Full Body' },
                    { id: 'upper_lower', label: 'Upper / Lower' },
                    { id: 'ppl', label: 'Push / Pull / Legs' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSplitStyle(s.id as any)}
                      className={`py-1.5 px-2 text-[11px] truncate rounded border text-left transition-colors ${
                        splitStyle === s.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-medium'
                          : 'bg-kaizen-bg border-kaizen-border text-kaizen-text-muted hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-kaizen-text-muted uppercase mb-1.5">
                  Session Target Focus
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'general_fitness', label: 'General Fitness' },
                    { id: 'hypertrophy', label: 'Hypertrophy' },
                    { id: 'strength', label: 'Strength' },
                    { id: 'fat_loss', label: 'Fat Loss' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTargetFocus(f.id as any)}
                      className={`py-1.5 px-2 text-[11px] truncate rounded border text-left transition-colors ${
                        targetFocus === f.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-medium'
                          : 'bg-kaizen-bg border-kaizen-border text-kaizen-text-muted hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-kaizen-border/60">
              <Button
                size="sm"
                onClick={handleGeneratePlan}
                disabled={isConfiguring}
                className="bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg font-semibold text-xs"
              >
                {isConfiguring ? 'Generating...' : 'Regenerate Plan with Presets'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 7-Day Weekly Selector Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-kaizen-text-muted font-mono uppercase tracking-wider">
          <span>Weekly Schedule</span>
          <span>Click a day to view or edit routine</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {schedule.map((day) => {
            const isSelected = selectedDayNumber === day.dayNumber;
            return (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDayNumber(day.dayNumber)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-kaizen-surface-elevated border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-md'
                    : 'bg-kaizen-card border-kaizen-border hover:border-kaizen-border/80 hover:bg-kaizen-surface-hover/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {day.dayName.slice(0, 3)}
                  </span>
                  {day.isRestDay ? (
                    <span className="text-[10px] font-mono text-kaizen-text-muted">Rest</span>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-400 font-medium">
                      {day.exercises.length} moves
                    </span>
                  )}
                </div>
                <div className="text-xs text-kaizen-text-secondary truncate mt-1.5 font-medium">
                  {day.isRestDay ? 'Recovery' : day.title.split(' - ')[1] || day.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day View */}
      {selectedDay && (
        <div className="bg-kaizen-card border border-kaizen-border rounded-xl p-5 sm:p-6 space-y-5">
          {/* Day Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kaizen-border">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-emerald-400 font-semibold uppercase">
                  {selectedDay.dayName} • Day {selectedDay.dayNumber}
                </span>
                {!selectedDay.isRestDay && (
                  <span className="text-[11px] font-mono text-kaizen-text-muted">
                    • ~{selectedDay.estimatedDurationMinutes || 45} mins
                  </span>
                )}
                {!isEditingDayInline && (
                  <button
                    type="button"
                    onClick={() => {
                      setInlineTitle(selectedDay.title);
                      setInlineFocus(selectedDay.focus);
                      setIsEditingDayInline(true);
                    }}
                    className="text-kaizen-text-muted hover:text-emerald-400 p-0.5 rounded transition-colors inline-flex items-center gap-1 text-[11px] font-mono ml-1"
                    title="Edit session title and focus inline"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="underline">Edit Title</span>
                  </button>
                )}
              </div>

              {isEditingDayInline ? (
                <div className="mt-2.5 space-y-2 max-w-md">
                  <input
                    type="text"
                    value={inlineTitle}
                    onChange={e => setInlineTitle(e.target.value)}
                    placeholder="Session Title (e.g. Upper Body Push)"
                    className="w-full bg-kaizen-bg border border-kaizen-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-kaizen-text-muted focus:border-emerald-500 outline-none"
                  />
                  <input
                    type="text"
                    value={inlineFocus}
                    onChange={e => setInlineFocus(e.target.value)}
                    placeholder="Target Focus (e.g. Chest, Shoulders & Triceps)"
                    className="w-full bg-kaizen-bg border border-kaizen-border rounded-lg px-3 py-1.5 text-xs text-kaizen-text placeholder-kaizen-text-muted focus:border-emerald-500 outline-none"
                  />
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleSaveDayInline}
                      className="px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg font-semibold text-xs transition-colors"
                    >
                      Save Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInlineTitle(selectedDay.title);
                        setInlineFocus(selectedDay.focus);
                        setIsEditingDayInline(false);
                      }}
                      className="px-2.5 py-1 rounded-md bg-transparent hover:bg-white/5 text-kaizen-text-muted hover:text-white text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1">
                    {selectedDay.title}
                  </h2>
                  <p className="text-xs text-kaizen-text-secondary mt-0.5">
                    {selectedDay.focus}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBuilderMode('edit');
                  setBuilderInitialDay(selectedDay.dayNumber - 1);
                  setIsCustomBuilderOpen(true);
                }}
                className="gap-1.5 text-xs text-kaizen-text border-kaizen-border hover:text-white"
                title="Edit routine in custom plan builder"
              >
                <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                Edit Day
              </Button>

              {!selectedDay.isRestDay && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddExerciseOpen(true)}
                  className="gap-1.5 text-xs text-white border-kaizen-border hover:border-emerald-500/50"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Add Exercise
                </Button>
              )}

              {/* Clear Day button */}
              {selectedDay && !selectedDay.isRestDay && selectedDay.exercises.length > 0 && (
                confirmClearDay ? (
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                    <span className="text-xs text-rose-400">Clear day?</span>
                    <button
                      type="button"
                      onClick={() => handleClearCurrentDay(selectedDay.dayNumber)}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearDay(false)}
                      className="text-xs text-kaizen-text-muted hover:text-white ml-0.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmClearDay(true)}
                    className="gap-1.5 text-xs text-kaizen-text-muted hover:text-rose-400 hover:bg-rose-500/10"
                    title="Clear exercises from this day"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Day
                  </Button>
                )
              )}

              {/* Delete Routine option (if custom plan) */}
              {plan?.isCustomPlan && (
                confirmDeletePlan ? (
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                    <span className="text-xs text-rose-400">Delete routine?</span>
                    <button
                      type="button"
                      onClick={handleDeleteOrResetPlan}
                      disabled={isDeletingPlan}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                    >
                      {isDeletingPlan ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePlan(false)}
                      className="text-xs text-kaizen-text-muted hover:text-white ml-0.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeletePlan(true)}
                    className="gap-1.5 text-xs text-kaizen-text-muted hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete custom routine and reset to default inventory plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Routine
                  </Button>
                )
              )}

              {!selectedDay.isRestDay && (
                <Button
                  size="sm"
                  disabled={isActivating || selectedDay.exercises.length === 0}
                  onClick={() => handleActivateDay(selectedDay.dayNumber)}
                  className="gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isActivating ? 'Loading...' : 'Start This Workout'}
                </Button>
              )}
            </div>
          </div>

          {/* Exercises Table / Clean Row List */}
          {selectedDay.isRestDay ? (
            <div className="py-12 text-center text-kaizen-text-muted space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-white/5 flex items-center justify-center text-kaizen-text-muted">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-white">Scheduled Rest Day</p>
              <p className="text-xs text-kaizen-text-secondary max-w-sm mx-auto">
                Prioritize sleep, hydration, and nutritional recovery to allow muscle tissues and central nervous system to adapt.
              </p>
            </div>
          ) : selectedDay.exercises.length === 0 ? (
            <div className="py-12 text-center text-kaizen-text-muted space-y-3 border border-dashed border-kaizen-border rounded-xl">
              <p className="text-xs">No movements assigned to this session yet.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddExerciseOpen(true)}
                className="gap-1.5 text-xs text-emerald-400 border-emerald-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Your First Exercise
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-kaizen-text-muted font-mono uppercase tracking-wider pb-1">
                <span>Movements ({selectedDay.exercises.length})</span>
                <span>Actions</span>
              </div>

              {selectedDay.exercises.map((ex, exIdx) => {
                const isTipsExpanded = expandedTipsIndex === exIdx;
                return (
                  <div
                    key={exIdx}
                    className="p-3.5 rounded-lg bg-kaizen-bg border border-kaizen-border hover:border-kaizen-border/80 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Number, Name, Muscle, Equipment */}
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-md bg-white/5 border border-white/5 flex items-center justify-center text-xs font-mono text-kaizen-text-muted shrink-0 mt-0.5">
                          {exIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-white">
                              {ex.exerciseName}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-kaizen-text-secondary border border-white/5 capitalize">
                              {ex.targetMuscle}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-kaizen-text-muted border border-white/5 capitalize">
                              {ex.equipment}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-kaizen-text-secondary">
                            <span>
                              Target: <strong className="text-white">{ex.targetSets} sets × {ex.targetReps} reps</strong>
                            </span>
                            {ex.suggestedWeightKg > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  Load: <strong className="text-emerald-400">{ex.suggestedWeightKg} kg</strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenVideo(ex)}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-kaizen-text-secondary hover:text-white hover:bg-white/5 border border-kaizen-border transition-colors flex items-center gap-1.5"
                          title="Watch live form video demo"
                        >
                          <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                          <span>Video</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenSwapModal(selectedDay.dayNumber, exIdx, ex)}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-kaizen-text-secondary hover:text-white hover:bg-white/5 border border-kaizen-border transition-colors flex items-center gap-1.5"
                          title="Swap with compatible movement"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                          <span>Swap</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedTipsIndex(isTipsExpanded ? null : exIdx)}
                          className="p-1.5 rounded-md text-kaizen-text-muted hover:text-white hover:bg-white/5 transition-colors"
                          title="View technique cues"
                        >
                          {isTipsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(selectedDay.dayNumber, exIdx)}
                          className="p-1.5 rounded-md text-kaizen-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove exercise"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Technique Cues */}
                    {isTipsExpanded && (
                      <div className="pt-2 border-t border-kaizen-border/60 text-xs text-kaizen-text-secondary pl-9 space-y-1 animate-in fade-in duration-150">
                        <div className="text-[11px] font-mono text-kaizen-text-muted uppercase">Key Cues:</div>
                        {(ex.formTips && ex.formTips.length > 0 ? ex.formTips : ['Execute repetitions with strict form and full range of motion.']).map((tip, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-1.5">
                            <span className="text-emerald-400">•</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedDay && (
        <AddExerciseToDayModal
          isOpen={isAddExerciseOpen}
          onClose={() => setIsAddExerciseOpen(false)}
          dayNumber={selectedDay.dayNumber}
          dayTitle={selectedDay.title}
        />
      )}

      <CustomPlanBuilderModal
        isOpen={isCustomBuilderOpen}
        onClose={() => setIsCustomBuilderOpen(false)}
        initialPlan={plan}
        mode={builderMode}
        initialDayIndex={builderInitialDay}
      />

      <ExerciseVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        exercise={activeVideoExercise}
      />

      {swapTarget && (
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
