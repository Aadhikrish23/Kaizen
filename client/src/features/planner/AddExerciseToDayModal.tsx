import React, { useState, useMemo } from 'react';
import { useExercises } from '../../services/exerciseService';
import { useAddExerciseToPlanDay } from '../../services/plannerService';
import { Exercise, PlannedExercise } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Search, X, Plus, Check } from 'lucide-react';

interface AddExerciseToDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  dayTitle: string;
}

const MUSCLE_FILTERS = ['all', 'chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'core'] as const;

export const AddExerciseToDayModal: React.FC<AddExerciseToDayModalProps> = ({
  isOpen,
  onClose,
  dayNumber,
  dayTitle,
}) => {
  const { data: exercisesData } = useExercises();
  const { mutateAsync: addExercise, isPending } = useAddExerciseToPlanDay();

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Exercise config
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(0);
  const [isAdded, setIsAdded] = useState(false);

  const exercises: Exercise[] = useMemo(() => {
    if (!exercisesData) return [];
    return Array.isArray(exercisesData) ? exercisesData : [];
  }, [exercisesData]);

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.targetMuscle.toLowerCase().includes(search.toLowerCase());
      const matchMuscle = selectedMuscle === 'all' || ex.targetMuscle.toLowerCase() === selectedMuscle;
      return matchSearch && matchMuscle;
    });
  }, [exercises, search, selectedMuscle]);

  if (!isOpen) return null;

  const handleSelect = (ex: Exercise) => {
    setSelectedExercise(ex);
    setIsAdded(false);
    if (ex.equipment === 'dumbbell') setWeightKg(10);
    else if (ex.equipment === 'barbell') setWeightKg(20);
    else setWeightKg(0);
  };

  const handleConfirmAdd = async () => {
    if (!selectedExercise) return;
    const plannedEx: PlannedExercise = {
      exerciseId: selectedExercise._id,
      exerciseName: selectedExercise.name,
      targetMuscle: selectedExercise.targetMuscle,
      equipment: selectedExercise.equipment,
      targetSets: Number(sets) || 3,
      targetReps: Number(reps) || 10,
      suggestedWeightKg: Number(weightKg) || 0,
      restSeconds: 60,
      videoUrl: selectedExercise.videoUrl || 'https://www.youtube.com/embed/rT7DgCr-3pg',
      formTips: selectedExercise.formTips || ['Maintain controlled tempo and braced core.'],
      notes: selectedExercise.instructions || '',
    };

    try {
      await addExercise({ dayNumber, exercise: plannedEx });
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
        setSelectedExercise(null);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to add exercise', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-kaizen-card border border-kaizen-border rounded-xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-kaizen-border">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight">Add Exercise to Day {dayNumber}</h3>
            <p className="text-xs text-kaizen-text-secondary">{dayTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-kaizen-text-secondary hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Muscle Filters */}
        <div className="pt-4 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-kaizen-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search exercise by name or muscle..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-kaizen-bg border-kaizen-border text-sm"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {MUSCLE_FILTERS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMuscle(m)}
                className={`px-3 py-1 rounded-full capitalize font-mono text-[11px] transition-colors shrink-0 ${
                  selectedMuscle === m
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-kaizen-text-muted hover:text-white border border-transparent'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Body: Two columns if selected, or full list */}
        <div className="flex-1 overflow-y-auto min-h-[260px] my-4 pr-1 divide-y divide-kaizen-border/50">
          {filteredExercises.length === 0 ? (
            <div className="py-12 text-center text-xs text-kaizen-text-muted">
              No exercises match your search criteria.
            </div>
          ) : (
            filteredExercises.map(ex => {
              const isCurrent = selectedExercise?._id === ex._id;
              return (
                <div
                  key={ex._id}
                  onClick={() => handleSelect(ex)}
                  className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-emerald-950/30 border border-emerald-500/40 text-white'
                      : 'hover:bg-white/5 text-kaizen-text'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm text-white">{ex.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-kaizen-text-muted font-mono">
                      <span className="capitalize">{ex.targetMuscle}</span>
                      <span>•</span>
                      <span className="capitalize">{ex.equipment}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrent ? (
                      <span className="p-1 rounded-full bg-emerald-500 text-kaizen-bg">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-xs text-kaizen-text-muted group-hover:text-white flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" />
                        Select
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Exercise Targets Bar */}
        {selectedExercise && (
          <div className="pt-3 border-t border-kaizen-border bg-kaizen-bg/60 p-4 rounded-xl space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">
                Configure Targets for: <strong className="text-white">{selectedExercise.name}</strong>
              </span>
              <span className="text-[11px] font-mono text-kaizen-text-muted uppercase">
                {selectedExercise.equipment}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-kaizen-text-muted uppercase mb-1">
                  Sets
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={sets}
                  onChange={e => setSets(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-kaizen-card border-kaizen-border text-center font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-kaizen-text-muted uppercase mb-1">
                  Reps
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={reps}
                  onChange={e => setReps(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-kaizen-card border-kaizen-border text-center font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-kaizen-text-muted uppercase mb-1">
                  Weight (kg)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={weightKg}
                  onChange={e => setWeightKg(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-kaizen-card border-kaizen-border text-center font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedExercise(null)}
              >
                Clear
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={handleConfirmAdd}
                className={`flex items-center gap-1.5 ${
                  isAdded
                    ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-kaizen-bg font-semibold'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added!
                  </>
                ) : isPending ? (
                  'Adding...'
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Day {dayNumber}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
