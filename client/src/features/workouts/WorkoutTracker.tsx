import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { workoutService } from '../../services/workoutService';
import { exerciseService } from '../../services/exerciseService';
import { WorkoutLog, WorkoutSplitSchedule, Exercise, WorkoutExercise } from '../../types';
import { Dumbbell, Plus, Trash2, CheckCircle2, Circle, Calendar, Flame, Clock } from 'lucide-react';

interface WorkoutTrackerProps {
  currentDate: string;
  onUpdate?: () => void;
}

export const WorkoutTracker: React.FC<WorkoutTrackerProps> = ({ currentDate, onUpdate }) => {
  const [schedule, setSchedule] = useState<WorkoutSplitSchedule | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutLog | null>(null);
  const [exercisesCatalog, setExercisesCatalog] = useState<Exercise[]>([]);
  const [selectedSplitName, setSelectedSplitName] = useState('Push Day');
  const [activeExercises, setActiveExercises] = useState<WorkoutExercise[]>([]);
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');
  
  // Custom Exercise modal/form state
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core'>('chest');
  const [newExEquipment, setNewExEquipment] = useState<'dumbbell' | 'barbell' | 'bodyweight' | 'band' | 'cable' | 'machine' | 'other'>('dumbbell');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sched, workout, catalog] = await Promise.all([
        workoutService.getSplitSchedule(),
        workoutService.getWorkoutForDate(currentDate),
        exerciseService.getExercises()
      ]);
      setSchedule(sched);
      setCurrentWorkout(workout);
      setExercisesCatalog(catalog);

      if (workout) {
        setSelectedSplitName(workout.splitName);
        setActiveExercises(workout.exercises);
        setDuration(workout.durationMinutes ? workout.durationMinutes.toString() : '45');
        setNotes(workout.notes || '');
      } else if (sched) {
        setSelectedSplitName(sched.today.splitName);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  if (loading && !currentWorkout && activeExercises.length === 0) {
    return (
      <div className="py-20 text-center text-xs font-mono text-kaizen-muted">
        Loading workout session...
      </div>
    );
  }

  // Exercise additions to workout session
  const handleAddExerciseToSession = (exercise: Exercise) => {
    const newEx: WorkoutExercise = {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      targetMuscle: exercise.targetMuscle,
      sets: [
        { setNumber: 1, weightKg: 15, reps: 10, rpe: 8, completed: true },
        { setNumber: 2, weightKg: 15, reps: 10, rpe: 8, completed: true },
        { setNumber: 3, weightKg: 17.5, reps: 8, rpe: 9, completed: false }
      ]
    };
    setActiveExercises([...activeExercises, newEx]);
  };

  const handleRemoveExerciseFromSession = (index: number) => {
    const updated = activeExercises.filter((_, i) => i !== index);
    setActiveExercises(updated);
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
      await workoutService.saveWorkout({
        date: currentDate,
        splitName: selectedSplitName,
        muscleGroups: Array.from(new Set(activeExercises.map(e => e.targetMuscle))),
        exercises: activeExercises,
        durationMinutes: duration ? parseInt(duration, 10) : 45,
        notes
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName) return;

    try {
      const created = await exerciseService.createExercise({
        name: newExName,
        targetMuscle: newExMuscle,
        equipment: newExEquipment
      });
      setExercisesCatalog([...exercisesCatalog, created]);
      handleAddExerciseToSession(created);
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
    <div className="space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-kaizen-text">Strength & Workout Training</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Progressive overload & home gym set tracker</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-kaizen-muted flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-kaizen-workout" />
            Session Volume: <strong className="text-kaizen-text">{currentVolume.toLocaleString()} kg</strong>
          </span>
          <Button variant="primary" size="sm" onClick={handleSaveWorkout}>
            {currentWorkout ? 'Update Session' : 'Save Session'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-control">
          {error}
        </div>
      )}

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-control font-mono">
          Workout session recorded successfully!
        </div>
      )}

      {/* Split Schedule Banner: Today vs Tomorrow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today */}
        <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-kaizen-workout" />
              <span className="text-[11px] font-mono text-kaizen-muted uppercase tracking-wider">Today's Focus</span>
              <Badge variant="rose" size="sm">Active</Badge>
            </div>
            <h3 className="font-bold text-base text-kaizen-text">
              {schedule?.today.splitName || selectedSplitName}
            </h3>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {schedule?.today.targetMuscles.map(m => (
                <span key={m} className="text-[10px] font-mono px-2 py-0.5 bg-kaizen-bg border border-kaizen-border rounded-sm text-kaizen-muted uppercase">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={selectedSplitName}
            onChange={(e) => setSelectedSplitName(e.target.value)}
            className="text-xs font-mono bg-kaizen-bg border border-kaizen-border rounded-control px-2 py-1 text-kaizen-text w-32"
            placeholder="Custom split"
            title="Edit today's split name"
          />
        </div>

        {/* Tomorrow */}
        <div className="p-4 bg-kaizen-surface/60 border border-kaizen-border rounded-structural flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-kaizen-muted" />
              <span className="text-[11px] font-mono text-kaizen-muted uppercase tracking-wider">Tomorrow's Preview</span>
              <Badge variant="neutral" size="sm">Upcoming</Badge>
            </div>
            <h3 className="font-semibold text-base text-kaizen-text">
              {schedule?.tomorrow.splitName || 'Pull Day'}
            </h3>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {schedule?.tomorrow.targetMuscles.map(m => (
                <span key={m} className="text-[10px] font-mono px-2 py-0.5 bg-kaizen-bg border border-kaizen-border rounded-sm text-kaizen-muted uppercase">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Exercise Logger & Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session Exercises & Set Tables */}
        <div className="lg:col-span-8 space-y-4">
          {activeExercises.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-kaizen-border rounded-structural bg-kaizen-surface/40">
              <Dumbbell className="w-8 h-8 text-kaizen-subtle mx-auto mb-3 opacity-40" />
              <h4 className="font-semibold text-sm text-kaizen-text">No exercises added to this workout yet</h4>
              <p className="text-xs text-kaizen-muted mt-1 max-w-sm mx-auto">
                Select exercises from your directory on the right, or create a custom home gym movement to begin tracking sets.
              </p>
            </div>
          ) : (
            activeExercises.map((ex, exIndex) => (
              <div key={exIndex} className="p-5 bg-kaizen-surface border border-kaizen-border rounded-structural space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-kaizen-border/60">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-kaizen-text">{ex.exerciseName}</h4>
                    <Badge variant="rose" size="sm">{ex.targetMuscle}</Badge>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowNewExercise(!showNewExercise)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> New
              </Button>
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
    </div>
  );
};
