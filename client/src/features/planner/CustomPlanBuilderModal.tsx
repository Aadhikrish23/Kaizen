import React, { useState } from 'react';
import { useSaveCustomPlan } from '../../services/plannerService';
import { useExercises } from '../../services/exerciseService';
import { PlannedDay, PlannedExercise, Exercise } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { X, Plus, Trash2, Check, Calendar, Dumbbell } from 'lucide-react';

interface CustomPlanBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomPlanBuilderModal: React.FC<CustomPlanBuilderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { mutateAsync: saveCustomPlan, isPending } = useSaveCustomPlan();
  const { data: exercisesData } = useExercises();

  const exercisesList: Exercise[] = Array.isArray(exercisesData) ? exercisesData : [];

  const [programName, setProgramName] = useState('My Custom Split');
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize schedule structure with 7 days
  const [schedule, setSchedule] = useState<PlannedDay[]>([
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
  ]);

  if (!isOpen) return null;

  const currentDay = schedule[activeDayIndex] || schedule[0];

  const updateCurrentDay = (updates: Partial<PlannedDay>) => {
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
      }, 700);
    } catch (err: any) {
      console.error('Failed to save custom plan', err);
      setError(err?.response?.data?.message || err.message || 'Failed to save custom plan');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl bg-kaizen-card border border-kaizen-border rounded-xl shadow-2xl p-6 relative max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-kaizen-border">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">Create Custom Workout Plan</h3>
            <p className="text-xs text-kaizen-text-secondary">
              Build your own training schedule and select exact exercises for each day
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
            <div>
              <label className="block text-xs font-mono text-kaizen-text-secondary uppercase mb-1">
                Active Training Days
              </label>
              <div className="text-xs text-kaizen-text-muted mt-2 font-mono flex items-center gap-2">
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
                        className="bg-kaizen-card border-kaizen-border text-xs"
                      />
                    </div>
                  </div>

                  {/* Planned Exercises List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    <div className="text-xs font-mono text-kaizen-text-muted uppercase tracking-wider">
                      Planned Movements ({currentDay.exercises.length})
                    </div>
                    {currentDay.exercises.length === 0 ? (
                      <div className="py-8 text-center text-xs text-kaizen-text-muted border border-dashed border-kaizen-border/60 rounded-lg">
                        No exercises added yet. Select from the exercise list on the right to add movements.
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

            {/* Right: Quick Exercise Picker to add into active day */}
            <div className="flex flex-col overflow-hidden bg-kaizen-bg/70 border border-kaizen-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-kaizen-border/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm text-white">Exercise Directory</span>
                </div>
                <span className="text-[11px] font-mono text-kaizen-text-muted">
                  Click + to add to {currentDay.dayName}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 divide-y divide-kaizen-border/40">
                {exercisesList.slice(0, 25).map(ex => (
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
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-kaizen-border shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
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
              ) : isPending ? (
                'Saving Plan...'
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
