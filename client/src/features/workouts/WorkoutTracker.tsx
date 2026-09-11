import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';
import { useSplitSchedule, useWorkoutLogs, useAddWorkoutLog, useDeleteWorkoutLog } from '../../services/workoutService';
import { useExercises, useAddExercise } from '../../services/exerciseService';
import { useInventory } from '../../services/inventoryService';
import { useUserPlan, useActivatePlannedDay } from '../../services/plannerService';
import { WorkoutLog, WorkoutSplitSchedule, Exercise, WorkoutExercise } from '../../types';
import { Dumbbell, Plus, Trash2, CheckCircle2, Circle, Calendar, Flame, Clock, BookOpen, Play } from 'lucide-react';
import { ExerciseCatalogModal } from './ExerciseCatalogModal';
import { ExerciseVideoModal } from './ExerciseVideoModal';

interface WorkoutTrackerProps {
  currentDate: string;
  onUpdate?: () => void;
  onNavigateToPlanner?: () => void;
}

export const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({ currentDate, onUpdate, onNavigateToPlanner }) => {
  const { data: scheduleData, isLoading: loadingSchedule } = useSplitSchedule();
  const { data: workoutData, isLoading: loadingWorkout } = useWorkoutLogs(currentDate);
  const { data: catalogData, isLoading: loadingCatalog } = useExercises();
  const { data: inventory } = useInventory();
  const { data: userPlan } = useUserPlan();

  const { mutateAsync: addWorkoutLog } = useAddWorkoutLog();
  const { mutateAsync: addExercise } = useAddExercise();
  const { mutateAsync: activatePlannedDay, isPending: isActivatingPlan } = useActivatePlannedDay();
  const { mutateAsync: deleteWorkoutLog, isPending: isDeletingWorkout } = useDeleteWorkoutLog(currentDate);

  const schedule: WorkoutSplitSchedule | null = (scheduleData as any) || null;
  const currentWorkout: WorkoutLog | null = Array.isArray(workoutData) ? (workoutData[0] as any) : ((workoutData as any) || null);
  const exercisesCatalog: Exercise[] = (catalogData as any) || [];

  const jsDay = new Date(currentDate).getDay(); // 0 is Sun, 1 is Mon...
  const currentDayNumber = jsDay === 0 ? 7 : jsDay;
  const todayPlannedDay = userPlan?.schedule?.find((d: any) => d.dayNumber === currentDayNumber);
  const availableDaysWithExercises = (userPlan?.schedule || []).filter(
    (d: any) => !d.isRestDay && d.exercises && d.exercises.length > 0
  );

  const handleLoadPlannedRoutine = async () => {
    const dayToLoad = todayPlannedDay?.dayNumber || (schedule?.today as any)?.dayNumber || currentDayNumber;
    try {
      setError(null);
      await activatePlannedDay({ dayNumber: dayToLoad, date: currentDate });
    } catch (err: any) {
      setError(err.message || 'Failed to load planned routine');
    }
  };

  const handleLoadDayRoutine = async (dayNumber: number) => {
    try {
      setError(null);
      await activatePlannedDay({ dayNumber, date: currentDate });
    } catch (err: any) {
      setError(err.message || 'Failed to load planned routine');
    }
  };

  const [selectedSplitName, setSelectedSplitName] = useState('Push Day');
  const [activeExercises, setActiveExercises] = useState<WorkoutExercise[]>([]);
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');
  
  // Custom Exercise modal/form state
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedVideoExercise, setSelectedVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core'>('chest');
  const [newExEquipment, setNewExEquipment] = useState<'dumbbell' | 'barbell' | 'bodyweight' | 'band' | 'cable' | 'machine' | 'other'>('dumbbell');

  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentWorkout) {
      setSelectedSplitName(currentWorkout.splitName);
      setActiveExercises(currentWorkout.exercises);
      setDuration(currentWorkout.durationMinutes ? currentWorkout.durationMinutes.toString() : '45');
      setNotes(currentWorkout.notes || '');
    } else if (schedule) {
      setSelectedSplitName(schedule.today.splitName);
      setActiveExercises([]); // Clear when switching to empty date
    }
  }, [currentWorkout, schedule]);

  const isLoading = loadingSchedule || loadingWorkout || loadingCatalog;

  if (isLoading && !currentWorkout && activeExercises.length === 0) {
    return <LoadingState message="Loading workout session..." />;
  }

  // Exercise additions to workout session (inventory-aware default weights)
  const handleAddExerciseToSession = (exercise: Exercise) => {
    let initialWeight = 15;
    const workingWeight = inventory?.workingWeights?.find(
      (ww) => ww.exerciseName.toLowerCase() === exercise.name.toLowerCase()
    );
    if (workingWeight && workingWeight.currentWeightKg > 0) {
      initialWeight = workingWeight.currentWeightKg;
    } else if (exercise.equipment === 'bodyweight') {
      initialWeight = 0;
    } else if (exercise.equipment === 'barbell') {
      initialWeight = 20;
    } else if (exercise.equipment === 'dumbbell' && inventory?.equipment) {
      const db = inventory.equipment.find((e) => e.type === 'dumbbell');
      if (db?.availableWeightsKg?.length) {
        initialWeight = db.availableWeightsKg[0] || 10;
      }
    }

    const newEx: WorkoutExercise = {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      targetMuscle: exercise.targetMuscle,
      sets: [
        { setNumber: 1, weightKg: initialWeight, reps: 10, rpe: 8, completed: true },
        { setNumber: 2, weightKg: initialWeight, reps: 10, rpe: 8, completed: true },
        { setNumber: 3, weightKg: initialWeight, reps: 8, rpe: 9, completed: false }
      ]
    };
    setActiveExercises([...activeExercises, newEx]);
  };

  const handleOpenVideoForExercise = (exerciseName: string) => {
    const found = exercisesCatalog.find(
      (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
    );
    if (found) {
      setSelectedVideoExercise(found);
    } else {
      setSelectedVideoExercise({
        _id: 'temp',
        name: exerciseName,
        targetMuscle: 'chest',
        equipment: 'dumbbell',
        instructions: 'Follow standard movement path with strict controlled form.',
      });
    }
    setIsVideoModalOpen(true);
  };

  const handleClearSession = async () => {
    if (activeExercises.length > 0 && !window.confirm('Clear all movements and discard this active workout session?')) {
      return;
    }
    try {
      setError(null);
      if (currentWorkout && (currentWorkout as any)._id) {
        await deleteWorkoutLog((currentWorkout as any)._id);
      }
      setActiveExercises([]);
      setSelectedSplitName('');
      setDuration('45');
      setNotes('');
      setSavedSuccess(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to clear session');
    }
  };

  const handleRemoveExerciseFromSession = async (index: number) => {
    const updated = activeExercises.filter((_, i) => i !== index);
    setActiveExercises(updated);
    if (currentWorkout && (currentWorkout as any)._id) {
      try {
        if (updated.length === 0) {
          await deleteWorkoutLog((currentWorkout as any)._id);
          setSelectedSplitName('');
        } else {
          await addWorkoutLog({
            date: currentDate,
            splitName: selectedSplitName,
            muscleGroups: Array.from(new Set(updated.map(e => e.targetMuscle))),
            exercises: updated,
            durationMinutes: duration ? parseInt(duration, 10) : 45,
            notes,
          });
        }
        if (onUpdate) onUpdate();
      } catch (e) {
        console.error('Failed to sync exercise removal', e);
      }
    }
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updated = [...activeExercises];
    const prevSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1];
    const newSetNumber = updated[exerciseIndex].sets.length + 1;
    updated[exerciseIndex].sets.push({
      setNumber: newSetNumber,
      weightKg: prevSet ? prevSet.weightKg : 15,
      reps: prevSet ? prevSet.reps : 10,
      rpe: prevSet?.rpe || 8,
      completed: false
    });
    setActiveExercises(updated);
  };

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weightKg' | 'reps' | 'rpe' | 'completed',
    value: any
  ) => {
    const updated = [...activeExercises];
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setActiveExercises(updated);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...activeExercises];
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    // Re-index
    updated[exerciseIndex].sets.forEach((s, i) => { s.setNumber = i + 1; });
    setActiveExercises(updated);
  };

  const handleSaveWorkout = async () => {
    if (activeExercises.length === 0) {
      setError('Please add at least one exercise to save your workout session.');
      return;
    }

    try {
      setError(null);
      await addWorkoutLog({
        date: currentDate,
        splitName: selectedSplitName,
        muscleGroups: Array.from(new Set(activeExercises.map(e => e.targetMuscle))),
        exercises: activeExercises,
        durationMinutes: duration ? parseInt(duration, 10) : 45,
        notes
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onUpdate) onUpdate();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName) return;

    try {
      await addExercise({
        name: newExName,
        targetMuscle: newExMuscle,
        equipment: newExEquipment
      });
      // Optionally we might want to wait and get the created exercise to add it directly to session, 
      // but without the full return type from addExercise we can just close the modal.
      setNewExName('');
      setShowNewExercise(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Calculate live session volume load (Tonnage)
  const currentVolume = activeExercises.reduce((total, ex) => {
    return total + ex.sets.reduce((exTotal, s) => {
      return s.completed ? exTotal + (s.weightKg * s.reps) : exTotal;
    }, 0);
  }, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-kaizen-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-control bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">Strength & Workout Training</h2>
              <p className="text-xs text-kaizen-muted font-mono">Active workout session · progressive overload & set telemetry</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-control bg-kaizen-surface border border-kaizen-border text-xs font-mono text-kaizen-muted flex items-center gap-1.5 shadow-subtle">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Volume:</span> <strong className="text-rose-400 font-bold">{currentVolume.toLocaleString()} kg</strong>
          </div>
          {onNavigateToPlanner && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToPlanner}
              className="gap-1.5 text-xs text-kaizen-text border-kaizen-border hover:border-emerald-500/50"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Workout Planner
            </Button>
          )}
          {activeExercises.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeletingWorkout}
              onClick={handleClearSession}
              className="gap-1.5 text-xs text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
              title="Discard all exercises and clear this active workout session"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeletingWorkout ? 'Clearing...' : 'Clear Session'}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handleSaveWorkout} className="font-semibold shadow-glow-emerald">
            {currentWorkout ? 'Update Session' : 'Save Session'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono rounded-control">
          {error}
        </div>
      )}

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-control font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Workout session recorded successfully!
        </div>
      )}

      {/* Split Schedule Banner: Today vs Tomorrow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today */}
        <div className="p-4 sm:p-5 bg-kaizen-surface border border-kaizen-border rounded-structural flex items-start justify-between card-sheen shadow-subtle">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
              <span className="text-[11px] font-mono text-kaizen-muted uppercase tracking-wider">Today's Focus</span>
              <Badge variant={schedule?.today.isRestDay && activeExercises.length === 0 ? 'neutral' : 'rose'} size="sm">
                {schedule?.today.isRestDay && activeExercises.length === 0 ? 'Rest' : 'Active'}
              </Badge>
            </div>
            <h3 className="font-display font-bold text-lg text-white">
              {activeExercises.length > 0
                ? (selectedSplitName || schedule?.today.splitName || 'Active Workout')
                : (schedule?.today.splitName || 'Rest & Recovery')}
            </h3>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {schedule?.today.targetMuscles && schedule.today.targetMuscles.length > 0 ? (
                schedule.today.targetMuscles.map((m: string) => (
                  <span key={m} className="text-[10px] font-mono px-2 py-0.5 bg-kaizen-bg border border-kaizen-border rounded text-kaizen-muted uppercase">
                    {m}
                  </span>
                ))
              ) : (
                <span className="text-[10px] font-mono text-kaizen-subtle">
                  {schedule?.today.isRestDay && activeExercises.length === 0 ? 'Recovery / Rest Day' : 'Custom Session'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase">Split Name:</span>
            <input
              type="text"
              value={selectedSplitName}
              onChange={(e) => setSelectedSplitName(e.target.value)}
              className="text-xs font-mono bg-kaizen-bg border border-kaizen-border rounded-control px-2.5 py-1.5 text-white w-40 focus:border-rose-500 outline-none"
              placeholder="e.g. Push Day"
              title="Edit today's split name"
            />
          </div>
        </div>

        {/* Tomorrow */}
        <div className="p-4 sm:p-5 bg-kaizen-surface/60 border border-kaizen-border rounded-structural flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-kaizen-muted" />
              <span className="text-[11px] font-mono text-kaizen-muted uppercase tracking-wider">Tomorrow's Preview</span>
              <Badge variant="neutral" size="sm">
                {schedule?.tomorrow.isRestDay ? 'Rest' : 'Upcoming'}
              </Badge>
            </div>
            <h3 className="font-semibold text-base text-kaizen-text">
              {schedule?.tomorrow.splitName || 'Rest & Recovery'}
            </h3>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {schedule?.tomorrow.targetMuscles && schedule.tomorrow.targetMuscles.length > 0 ? (
                schedule.tomorrow.targetMuscles.map((m: string) => (
                  <span key={m} className="text-[10px] font-mono px-2 py-0.5 bg-kaizen-bg border border-kaizen-border rounded-sm text-kaizen-muted uppercase">
                    {m}
                  </span>
                ))
              ) : (
                <span className="text-[10px] font-mono text-kaizen-subtle">
                  Recovery / Rest Day
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Exercise Logger & Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session Exercises & Set Tables */}
        <div className="lg:col-span-8 space-y-4">
          {activeExercises.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-kaizen-border rounded-structural bg-kaizen-surface/40 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-kaizen-workout/10 border border-kaizen-workout/20 flex items-center justify-center text-kaizen-workout">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-base text-kaizen-text">No exercises added to this session yet</h4>
                <p className="text-xs text-kaizen-muted mt-1 max-w-md mx-auto">
                  {todayPlannedDay && !todayPlannedDay.isRestDay && todayPlannedDay.exercises?.length > 0
                    ? `You have a planned ${todayPlannedDay.title} scheduled for today with ${todayPlannedDay.exercises.length} exercises. Load it with 1 click or choose movements manually.`
                    : availableDaysWithExercises.length > 0
                    ? 'Load a routine from your custom weekly split, or select movements from the directory.'
                    : 'Select exercises from your directory on the right, or configure a routine in your Workout Planner.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                {todayPlannedDay && !todayPlannedDay.isRestDay && todayPlannedDay.exercises?.length > 0 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isActivatingPlan}
                    onClick={handleLoadPlannedRoutine}
                    className="gap-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isActivatingPlan ? 'Loading Routine...' : `Load Planned Routine (${todayPlannedDay.title})`}
                  </Button>
                ) : (
                  availableDaysWithExercises.map((d: any) => (
                    <Button
                      key={d.dayNumber}
                      variant="primary"
                      size="sm"
                      disabled={isActivatingPlan}
                      onClick={() => handleLoadDayRoutine(d.dayNumber)}
                      className="gap-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isActivatingPlan ? 'Loading...' : `Load Routine: ${d.title} (${d.exercises.length} moves)`}
                    </Button>
                  ))
                )}
                {onNavigateToPlanner && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onNavigateToPlanner}
                    className="gap-1.5 text-xs text-kaizen-muted hover:text-kaizen-text border-kaizen-border"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Open Workout Planner
                  </Button>
                )}
              </div>
            </div>
          ) : (
            activeExercises.map((ex, exIndex) => (
              <div key={exIndex} className="p-5 bg-kaizen-surface border border-kaizen-border rounded-structural space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-kaizen-border/60">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-kaizen-text">{ex.exerciseName}</h4>
                    <Badge variant="rose" size="sm">{ex.targetMuscle}</Badge>
                    <button
                      type="button"
                      onClick={() => handleOpenVideoForExercise(ex.exerciseName)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                      title="Watch live form demonstration video"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" /> Demo Video
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveExerciseFromSession(exIndex)}
                    className="text-kaizen-subtle hover:text-rose-400 p-1 transition-colors"
                    title="Remove exercise"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Set-by-Set Logging Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="text-kaizen-subtle border-b border-kaizen-border/40 pb-1">
                        <th className="py-1 px-2 w-12">SET</th>
                        <th className="py-1 px-2">WEIGHT (KG)</th>
                        <th className="py-1 px-2">REPS</th>
                        <th className="py-1 px-2 w-20">RPE (1-10)</th>
                        <th className="py-1 px-2 w-16 text-center">DONE</th>
                        <th className="py-1 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kaizen-border/40">
                      {ex.sets.map((set, setIndex) => (
                        <tr key={setIndex} className={`hover:bg-kaizen-surface-hover/50 ${set.completed ? 'opacity-90' : ''}`}>
                          <td className="py-2 px-2 font-bold text-kaizen-muted">
                            {set.setNumber}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.5"
                              value={set.weightKg}
                              onChange={(e) => handleSetChange(exIndex, setIndex, 'weightKg', parseFloat(e.target.value) || 0)}
                              className="w-20 bg-kaizen-bg border border-kaizen-border rounded px-2 py-1 text-kaizen-text focus:border-kaizen-primary outline-none"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(e) => handleSetChange(exIndex, setIndex, 'reps', parseInt(e.target.value, 10) || 0)}
                              className="w-16 bg-kaizen-bg border border-kaizen-border rounded px-2 py-1 text-kaizen-text focus:border-kaizen-primary outline-none"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              step="0.5"
                              value={set.rpe || 8}
                              onChange={(e) => handleSetChange(exIndex, setIndex, 'rpe', parseFloat(e.target.value) || 8)}
                              className="w-14 bg-kaizen-bg border border-kaizen-border rounded px-2 py-1 text-kaizen-text focus:border-kaizen-primary outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleSetChange(exIndex, setIndex, 'completed', !set.completed)}
                              className="transition-colors"
                            >
                              {set.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-kaizen-primary inline" />
                              ) : (
                                <Circle className="w-5 h-5 text-kaizen-subtle hover:text-kaizen-muted inline" />
                              )}
                            </button>
                          </td>
                          <td className="py-2 px-1 text-right">
                            <button
                              onClick={() => handleRemoveSet(exIndex, setIndex)}
                              className="text-kaizen-subtle hover:text-rose-400 p-1"
                              title="Delete set"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs font-mono">
                  <button
                    onClick={() => handleAddSet(exIndex)}
                    className="text-kaizen-primary hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Set
                  </button>
                  <span className="text-kaizen-muted text-[11px]">
                    Volume: {ex.sets.filter(s => s.completed).reduce((sum, s) => sum + (s.weightKg * s.reps), 0)} kg
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Session Notes & Duration */}
          <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Session Duration (Minutes)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              suffix="min"
            />
            <Input
              label="Session Notes / Performance Feeling"
              placeholder="e.g. Good pump, increased weight on dumbbell press"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Exercise Directory & Add Custom Exercise */}
        <div className="lg:col-span-4 space-y-4">
          <Card
            title="Exercise Directory"
            subtitle="Add exercises to today's workout"
            action={
              <div className="flex items-center gap-1.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCatalogModal(true)}
                  className="text-xs"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" /> Library
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowNewExercise(!showNewExercise)}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> New
                </Button>
              </div>
            }
          >
            {showNewExercise && (
              <form onSubmit={handleCreateCustomExercise} className="p-3 mb-4 bg-kaizen-bg border border-kaizen-border rounded-control space-y-3">
                <Input
                  label="Exercise Name"
                  placeholder="e.g. Incline Dumbbell Press"
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-kaizen-muted uppercase">Target Muscle</label>
                    <select
                      value={newExMuscle}
                      onChange={(e) => setNewExMuscle(e.target.value as any)}
                      className="bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1.5 text-xs text-kaizen-text outline-none"
                    >
                      <option value="chest">Chest</option>
                      <option value="back">Back</option>
                      <option value="legs">Legs</option>
                      <option value="shoulders">Shoulders</option>
                      <option value="biceps">Biceps</option>
                      <option value="triceps">Triceps</option>
                      <option value="core">Core</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-kaizen-muted uppercase">Equipment</label>
                    <select
                      value={newExEquipment}
                      onChange={(e) => setNewExEquipment(e.target.value as any)}
                      className="bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1.5 text-xs text-kaizen-text outline-none"
                    >
                      <option value="dumbbell">Dumbbell</option>
                      <option value="barbell">Barbell</option>
                      <option value="bodyweight">Bodyweight</option>
                      <option value="band">Resistance Band</option>
                      <option value="cable">Cable</option>
                      <option value="machine">Machine</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewExercise(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Create
                  </Button>
                </div>
              </form>
            )}

            {/* List of Available Exercises */}
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 divide-y divide-kaizen-border/30">
              {exercisesCatalog.length === 0 ? (
                <div className="py-6 text-center text-xs text-kaizen-muted font-mono">
                  No exercises in directory yet. Click "+ New" to add one.
                </div>
              ) : (
                exercisesCatalog.map((ex) => (
                  <div key={ex._id} className="pt-2 flex items-center justify-between group">
                    <div>
                      <span className="text-xs font-medium text-kaizen-text block">{ex.name}</span>
                      <span className="text-[10px] font-mono text-kaizen-subtle uppercase">{ex.targetMuscle} • {ex.equipment}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => handleAddExerciseToSession(ex)}
                    >
                      <Plus className="w-3 h-3 mr-0.5" /> Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <ExerciseCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onSelectExercise={(ex) => handleAddExerciseToSession(ex)}
      />

      <ExerciseVideoModal
        exercise={selectedVideoExercise}
        isOpen={isVideoModalOpen}
        onClose={() => {
          setIsVideoModalOpen(false);
          setSelectedVideoExercise(null);
        }}
        onAddToWorkout={(ex) => handleAddExerciseToSession(ex)}
      />
    </div>
  );
};
