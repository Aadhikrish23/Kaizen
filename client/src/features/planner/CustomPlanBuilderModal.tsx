import React, { useState, useEffect } from 'react';
import { useSaveCustomPlan, useDeletePlan } from '../../services/plannerService';
import { useExercises } from '../../services/exerciseService';
import { PlannedDay, PlannedExercise, Exercise, UserWorkoutPlan } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { X, Plus, Trash2, Check, Calendar, Dumbbell, Search } from 'lucide-react';

interface CustomPlanBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: UserWorkoutPlan | null;
  mode?: 'create' | 'edit';
}

const MUSCLE_PILLS = ['all', 'chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core'] as const;

const getDefaultSchedule = (): PlannedDay[] => [
  {
    dayNumber: 1,
    dayName: 'Monday',
    isRestDay: false,
    title: 'Upper Body Push',
    focus: 'Chest, Shoulders & Triceps',
    targetMuscles: ['chest', 'shoulders', 'triceps'],
    estimatedDurationMinutes: 50,
    exercises: [],
  },
  {
    dayNumber: 2,
    dayName: 'Tuesday',
    isRestDay: false,
    title: 'Upper Body Pull',
    focus: 'Back, Biceps & Rear Delts',
    targetMuscles: ['back', 'biceps'],
    estimatedDurationMinutes: 50,
    exercises: [],
  },
  {
    dayNumber: 3,
    dayName: 'Wednesday',
    isRestDay: true,
    title: 'Rest & Recovery',
    focus: 'Mobility & Central Nervous System Rest',
    targetMuscles: [],
    estimatedDurationMinutes: 0,
    exercises: [],
  },
  {
    dayNumber: 4,
    dayName: 'Thursday',
    isRestDay: false,
    title: 'Lower Body Strength',
    focus: 'Quads, Hamstrings & Core',
    targetMuscles: ['legs', 'core'],
    estimatedDurationMinutes: 50,
    exercises: [],
  },
  {
    dayNumber: 5,
    dayName: 'Friday',
    isRestDay: false,
    title: 'Full Body Circuit',
    focus: 'Compound movements and conditioning',
    targetMuscles: ['chest', 'back', 'legs'],
    estimatedDurationMinutes: 45,
    exercises: [],
  },
  {
    dayNumber: 6,
    dayName: 'Saturday',
    isRestDay: true,
    title: 'Rest & Recovery',
    focus: 'Active recovery and light walking',
    targetMuscles: [],
    estimatedDurationMinutes: 0,
    exercises: [],
  },
  {
    dayNumber: 7,
    dayName: 'Sunday',
    isRestDay: true,
    title: 'Rest & Recovery',
    focus: 'Rest before next training cycle',
    targetMuscles: [],
    estimatedDurationMinutes: 0,
    exercises: [],
  },
];

/**
 * Parses user input in the TARGET FOCUS field and extracts recognized muscle groups
 */
export const matchMusclesFromFocus = (focusText: string): string[] => {
  const f = (focusText || '').toLowerCase().trim();
  if (!f) return [];
  const list: string[] = [];
  if (
    f.includes('leg') ||
    f.includes('quad') ||
    f.includes('hamstring') ||
    f.includes('glute') ||
    f.includes('calf') ||
    f.includes('calves') ||
    f.includes('lower') ||
    f.includes('squat')
  ) {
    list.push('legs');
  }
  if (f.includes('chest') || f.includes('pec') || f.includes('push')) {
    list.push('chest');
  }
  if (
    f.includes('back') ||
    f.includes('lat') ||
    f.includes('pull') ||
    f.includes('row') ||
    f.includes('deadlift')
  ) {
    list.push('back');
  }
  if (f.includes('shoulder') || f.includes('delt') || f.includes('overhead')) {
    list.push('shoulders');
  }
  if (f.includes('bicep') || f.includes('arm') || f.includes('curl')) {
    list.push('biceps');
  }
  if (f.includes('tricep') || f.includes('dip')) {
    list.push('triceps');
  }
  if (f.includes('core') || f.includes('ab') || f.includes('midsection')) {
    list.push('core');
  }
  return list;
};

export const CustomPlanBuilderModal: React.FC<CustomPlanBuilderModalProps> = ({
  isOpen,
  onClose,
  initialPlan,
  mode = 'create',
}) => {
  const { mutateAsync: saveCustomPlan, isPending: isSaving } = useSaveCustomPlan();
  const { mutateAsync: deletePlanMutation, isPending: isDeleting } = useDeletePlan();
  const { data: exercisesData } = useExercises();

  const exercisesList: Exercise[] = Array.isArray(exercisesData) ? exercisesData : [];

  const [programName, setProgramName] = useState('My Custom Split');
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Search & Filter state for Exercise Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [autoFocusFilterEnabled, setAutoFocusFilterEnabled] = useState(true);

  // Initialize schedule structure with 7 days
  const [schedule, setSchedule] = useState<PlannedDay[]>(getDefaultSchedule());

  // Populate from initialPlan on open or mode switch
  useEffect(() => {
    if (isOpen) {
      if (initialPlan && initialPlan.schedule && initialPlan.schedule.length > 0 && mode !== 'create') {
        setProgramName(initialPlan.programName || 'My Custom Split');
        setSchedule(JSON.parse(JSON.stringify(initialPlan.schedule)));
      } else if (mode === 'create') {
        setProgramName('My Custom Split');
        setSchedule(getDefaultSchedule());
      }
      setSearchQuery('');
      setSelectedMuscle('all');
      setAutoFocusFilterEnabled(true);
      setError(null);
      setConfirmDelete(false);
    }
  }, [isOpen, initialPlan, mode]);

  if (!isOpen) return null;

  const currentDay = schedule[activeDayIndex] || schedule[0];
  const matchedFocusMuscles = matchMusclesFromFocus(currentDay?.focus || '');

  const updateCurrentDay = (updates: Partial<PlannedDay>) => {
    // If target focus is modified, reactivate the automatic focus filter
    if (updates.focus !== undefined) {
      setAutoFocusFilterEnabled(true);
      setSelectedMuscle('all');
    }
    setSchedule(prev => {
      const copy = [...prev];
      copy[activeDayIndex] = { ...copy[activeDayIndex], ...updates };
      return copy;
    });
  };

  const handleAddExerciseToCurrentDay = (ex: Exercise) => {
    const newEx: PlannedExercise = {
      exerciseId: ex._id,
      exerciseName: ex.name,
      targetMuscle: ex.targetMuscle,
      equipment: ex.equipment,
      targetSets: 3,
      targetReps: 10,
      suggestedWeightKg: ex.equipment === 'dumbbell' ? 10 : ex.equipment === 'barbell' ? 20 : 0,
      restSeconds: 60,
      videoUrl: ex.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
      formTips: ex.formTips || ['Maintain controlled cadence and rigid core.'],
      notes: ex.instructions || '',
    };

    setSchedule(prev => {
      const copy = [...prev];
      copy[activeDayIndex] = {
        ...copy[activeDayIndex],
        isRestDay: false,
        exercises: [...copy[activeDayIndex].exercises, newEx],
      };
      return copy;
    });
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    setSchedule(prev => {
      const copy = [...prev];
      const updatedExercises = copy[activeDayIndex].exercises.filter((_, idx) => idx !== exerciseIndex);
      copy[activeDayIndex] = {
        ...copy[activeDayIndex],
        exercises: updatedExercises,
        isRestDay: updatedExercises.length === 0,
      };
      return copy;
    });
  };

  const handleClearCurrentDay = () => {
    setSchedule(prev => {
      const copy = [...prev];
      copy[activeDayIndex] = {
        ...copy[activeDayIndex],
        exercises: [],
        isRestDay: true,
      };
      return copy;
    });
  };

  const handleResetAllDays = () => {
    if (window.confirm('Reset all 7 days to rest / empty?')) {
      setSchedule(prev =>
        prev.map(d => ({
          ...d,
          exercises: [],
          isRestDay: true,
          title: 'Rest & Recovery',
        }))
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await saveCustomPlan({
        programName,
        daysPerWeek: schedule.filter(d => !d.isRestDay).length,
        schedule,
      });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Failed to save custom plan', err);
      setError(err?.response?.data?.message || err.message || 'Failed to save custom plan');
    }
  };

  const handleDeletePlan = async () => {
    try {
      await deletePlanMutation();
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to delete plan');
    }
  };

  // Filter exercises by Search Query, Muscle Pill, or Target Focus
  const filteredExercises = exercisesList.filter(ex => {
    // 1. Text search takes absolute priority
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.targetMuscle.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q)
      );
    }

    // 2. Muscle pill filter
    if (selectedMuscle !== 'all') {
      return ex.targetMuscle.toLowerCase() === selectedMuscle.toLowerCase();
    }

    // 3. Smart filter by TARGET FOCUS field
    if (autoFocusFilterEnabled && matchedFocusMuscles.length > 0) {
      return matchedFocusMuscles.includes(ex.targetMuscle.toLowerCase());
    }

    return true;
  });

  const isEditingExisting = mode === 'edit';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl bg-kaizen-card border border-kaizen-border rounded-xl shadow-2xl p-6 relative max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-kaizen-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white tracking-tight">
                {isEditingExisting ? 'Edit Workout Plan' : 'Create Custom Workout Plan'}
              </h3>
              {isEditingExisting && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                  Editing Routine
                </span>
              )}
            </div>
            <p className="text-xs text-kaizen-text-secondary mt-0.5">
              Customize split schedule, day titles, and target exercises for each training session
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-kaizen-text-secondary hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden pt-4">
          {/* Top Bar: Plan Name & Active Days Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-kaizen-border/60 shrink-0">
            <div>
              <label className="block text-xs font-mono text-kaizen-text-secondary uppercase mb-1">
                Program Name
              </label>
              <Input
                type="text"
                value={programName}
                onChange={e => setProgramName(e.target.value)}
                placeholder="e.g. 4-Day Hypertrophy Split"
                required
                className="bg-kaizen-bg border-kaizen-border text-sm font-medium text-white"
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono text-kaizen-text-secondary uppercase mb-1">
                  Active Training Days
                </label>
                <button
                  type="button"
                  onClick={handleResetAllDays}
                  className="text-[11px] font-mono text-kaizen-text-muted hover:text-rose-400 transition-colors"
                >
                  Clear All Days
                </button>
              </div>
              <div className="text-xs text-kaizen-text-muted font-mono flex items-center gap-2">
                <span className="font-bold text-emerald-400 text-sm">
                  {schedule.filter(d => !d.isRestDay).length}
                </span>
                <span>training days / 7 days per week</span>
              </div>
            </div>
          </div>

          {/* 7-Day Selector Bar */}
          <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar shrink-0">
            {schedule.map((day, idx) => {
              const isActive = activeDayIndex === idx;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => setActiveDayIndex(idx)}
                  className={`px-3 py-2 rounded-lg text-left min-w-[95px] border transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-500 text-white font-medium shadow-sm'
                      : 'bg-kaizen-bg border-kaizen-border/80 text-kaizen-text-muted hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold">{day.dayName.slice(0, 3)}</div>
                  <div className="text-[10px] font-mono mt-0.5 truncate">
                    {day.isRestDay ? (
                      <span className="text-kaizen-text-muted">Rest</span>
                    ) : (
                      <span className="text-emerald-400">{day.exercises.length} moves</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Day Editor Container */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 overflow-hidden py-3">
            {/* Left: Active Day Details & Exercise List */}
            <div className="flex flex-col overflow-hidden bg-kaizen-bg/70 border border-kaizen-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-kaizen-border/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm text-white">
                    {currentDay.dayName} (Day {currentDay.dayNumber})
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-kaizen-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentDay.isRestDay}
                    onChange={e => updateCurrentDay({ isRestDay: e.target.checked })}
                    className="rounded border-kaizen-border text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Mark as Rest Day</span>
                </label>
              </div>

              {!currentDay.isRestDay && (
                <>
                  <div className="grid grid-cols-2 gap-3 shrink-0">
                    <div>
                      <label className="block text-[11px] font-mono text-kaizen-text-muted uppercase mb-1">
                        Session Title
                      </label>
                      <Input
                        type="text"
                        value={currentDay.title}
                        onChange={e => updateCurrentDay({ title: e.target.value })}
                        className="bg-kaizen-card border-kaizen-border text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-kaizen-text-muted uppercase mb-1">
                        Target Focus
                      </label>
                      <Input
                        type="text"
                        value={currentDay.focus}
                        onChange={e => updateCurrentDay({ focus: e.target.value })}
                        placeholder="e.g. legs, chest, back, shoulders"
                        className="bg-kaizen-card border-kaizen-border text-xs"
                      />
                    </div>
                  </div>

                  {/* Planned Exercises List */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between text-xs font-mono text-kaizen-text-muted uppercase tracking-wider pb-1">
                      <span>Planned Movements ({currentDay.exercises.length})</span>
                      {currentDay.exercises.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearCurrentDay}
                          className="text-[11px] font-mono text-kaizen-text-muted hover:text-rose-400 capitalize transition-colors"
                        >
                          Clear Day
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 mt-1">
                      {currentDay.exercises.length === 0 ? (
                        <div className="py-8 text-center text-xs text-kaizen-text-muted border border-dashed border-kaizen-border/60 rounded-lg">
                          No exercises added yet. Search or select from the Exercise Directory on the right.
                        </div>
                      ) : (
                        currentDay.exercises.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            className="p-2.5 rounded-lg bg-kaizen-card border border-kaizen-border flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-medium text-white">{ex.exerciseName}</div>
                              <div className="text-[11px] font-mono text-kaizen-text-muted flex items-center gap-2 mt-0.5">
                                <span>{ex.targetSets} sets × {ex.targetReps} reps</span>
                                {ex.suggestedWeightKg > 0 && <span>• {ex.suggestedWeightKg} kg</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(exIdx)}
                              className="text-kaizen-text-muted hover:text-rose-400 p-1 transition-colors"
                              title="Remove exercise"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {currentDay.isRestDay && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-kaizen-text-muted space-y-2">
                  <div className="p-3 rounded-full bg-white/5 text-kaizen-text-muted">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="text-xs">This day is designated for central nervous system and muscular recovery.</p>
                </div>
              )}
            </div>

            {/* Right: Searchable & Target Focus Filtered Exercise Picker */}
            <div className="flex flex-col overflow-hidden bg-kaizen-bg/70 border border-kaizen-border rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-kaizen-border/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm text-white">Exercise Directory</span>
                </div>
                <span className="text-[11px] font-mono text-kaizen-text-muted">
                  {filteredExercises.length} available
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-kaizen-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search exercises by name, muscle, equipment..."
                  className="w-full bg-kaizen-card border border-kaizen-border rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-kaizen-text-muted focus:border-emerald-500 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-kaizen-text-muted hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Focus Auto-Filter Indicator Banner */}
              {!searchQuery && selectedMuscle === 'all' && autoFocusFilterEnabled && matchedFocusMuscles.length > 0 && (
                <div className="flex items-center justify-between px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 shrink-0">
                  <span className="truncate">
                    Filtered by Focus: <strong>"{currentDay.focus}"</strong> ({matchedFocusMuscles.join(', ')})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoFocusFilterEnabled(false)}
                    className="underline hover:text-white ml-2 text-[10px] shrink-0 font-mono"
                  >
                    Show All
                  </button>
                </div>
              )}

              {/* Muscle Filters Pills Row */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0">
                {MUSCLE_PILLS.map(m => {
                  const isPillActive = selectedMuscle === m || (m === 'all' && selectedMuscle === 'all' && (!autoFocusFilterEnabled || matchedFocusMuscles.length === 0));
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSelectedMuscle(m);
                        setAutoFocusFilterEnabled(false);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-colors shrink-0 ${
                        isPillActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
                          : 'bg-white/5 text-kaizen-text-muted hover:text-white border border-transparent'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              {/* Exercises List */}
              <div className="flex-1 overflow-y-auto pr-1 divide-y divide-kaizen-border/40">
                {filteredExercises.length === 0 ? (
                  <div className="py-10 text-center text-xs text-kaizen-text-muted space-y-2">
                    <p>No exercises match your current filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedMuscle('all');
                        setAutoFocusFilterEnabled(false);
                      }}
                      className="text-emerald-400 hover:underline text-xs"
                    >
                      Clear search & filters
                    </button>
                  </div>
                ) : (
                  filteredExercises.map(ex => (
                    <div
                      key={ex._id}
                      className="py-2 flex items-center justify-between text-xs hover:bg-white/5 px-2 rounded-md transition-colors"
                    >
                      <div>
                        <div className="font-medium text-white">{ex.name}</div>
                        <div className="text-[10px] font-mono text-kaizen-text-muted capitalize">
                          {ex.targetMuscle} • {ex.equipment}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddExerciseToCurrentDay(ex)}
                        className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-kaizen-border shrink-0">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="text-xs"
              >
                Cancel
              </Button>

              {/* Delete / Reset Plan option if editing existing plan */}
              {isEditingExisting && (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                    <span className="text-xs text-rose-400">Delete custom plan?</span>
                    <button
                      type="button"
                      onClick={handleDeletePlan}
                      disabled={isDeleting}
                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-kaizen-text-muted hover:text-white ml-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1.5"
                    title="Delete this custom plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Plan
                  </Button>
                )
              )}
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-2 font-medium text-xs ${
                isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg font-semibold'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved Custom Plan!
                </>
              ) : isSaving ? (
                'Saving Plan...'
              ) : isEditingExisting ? (
                'Update Custom Plan'
              ) : (
                'Save Custom Plan'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

