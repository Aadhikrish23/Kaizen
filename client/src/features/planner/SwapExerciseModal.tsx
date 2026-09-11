import React, { useState, useMemo } from 'react';
import { X, RefreshCw, Search, Check, Play, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useExercises } from '../../services/exerciseService';
import { useSwapPlannedExercise } from '../../services/plannerService';
import { PlannedExercise, Exercise, EquipmentItem } from '../../types';
import { ExerciseVideoModal } from '../workouts/ExerciseVideoModal';

interface SwapExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  exerciseIndex: number;
  currentExercise: PlannedExercise;
  equipmentList: EquipmentItem[];
}

const MUSCLE_GROUPS = [
  { id: 'all', label: 'All Muscles' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'core', label: 'Core' },
];

/**
 * Strict client-side inventory compatibility evaluator matching server rules
 */
export const isExerciseCompatibleWithEquipment = (
  exercise: Exercise,
  equipment: EquipmentItem[]
): boolean => {
  const types = new Set((equipment || []).map((i) => (i.type || '').toLowerCase()));
  const names = (equipment || []).map((i) => (i.name || '').toLowerCase());
  const notes = (equipment || []).map((i) => (i.notes || '').toLowerCase());
  const allText = names.join(' ') + ' ' + notes.join(' ');

  const hasBench = types.has('bench') || allText.includes('bench');
  const hasDipBars = types.has('dip_bars') || types.has('dip_station') || allText.includes('dip');
  const hasPullupBar =
    types.has('pullup_bar') ||
    allText.includes('pull-up') ||
    allText.includes('pullup') ||
    allText.includes('chin-up');
  const hasBarbell = types.has('barbell') || allText.includes('barbell');
  const hasDumbbell = types.has('dumbbell') || allText.includes('dumbbell');
  const hasBands = types.has('bands') || types.has('band') || allText.includes('band');
  const hasCable = types.has('cable') || allText.includes('cable');
  const hasMachine = types.has('machine') || allText.includes('machine');
  const hasAbWheel = types.has('other') && (allText.includes('ab wheel') || allText.includes('roller'));
  const hasPushupBars = types.has('pushup_bar') || (types.has('other') && allText.includes('pushup'));

  const nameLower = (exercise.name || '').toLowerCase();
  const eqLower = (exercise.equipment || '').toLowerCase();

  // 1. Parallel bar / station dips strictly require dip bars or dip station
  if (nameLower.includes('dips') && !nameLower.includes('bench dips')) {
    if (!hasDipBars) return false;
  }

  // 2. Exercises strictly requiring a workout bench
  const benchKeywords = [
    'bench press',
    'incline dumbbell press',
    'decline barbell bench press',
    'dumbbell pullover',
    'incline dumbbell curl',
    'close-grip barbell bench press',
    'bench dips',
    'barbell hip thrust',
    'skull crusher',
    'preacher curl',
  ];
  if (benchKeywords.some((kw) => nameLower.includes(kw))) {
    if (!hasBench) return false;
  }

  // 3. Pull-up bar & hanging movements
  if (nameLower.includes('pull-ups') || nameLower.includes('chin-ups') || nameLower.includes('hanging leg')) {
    if (!hasPullupBar) return false;
  }

  // 4. Ab wheel roller
  if (nameLower.includes('ab wheel')) {
    if (!hasAbWheel) return false;
  }

  // 5. Deficit push-ups with handles
  if (nameLower.includes('deficit push-ups')) {
    if (!hasPushupBars) return false;
  }

  // 6. Base modality requirement
  if (eqLower === 'barbell' && !hasBarbell) return false;
  if (eqLower === 'dumbbell' && !hasDumbbell) return false;
  if ((eqLower === 'cable' || eqLower === 'cables') && !hasCable) return false;
  if (eqLower === 'machine' && !hasMachine) return false;
  if ((eqLower === 'band' || eqLower === 'bands') && !hasBands) return false;

  return true;
};

export const SwapExerciseModal: React.FC<SwapExerciseModalProps> = ({
  isOpen,
  onClose,
  dayNumber,
  exerciseIndex,
  currentExercise,
  equipmentList,
}) => {
  const { data: exercisesData, isLoading } = useExercises();
  const { mutateAsync: swapExercise, isPending: isSwapping } = useSwapPlannedExercise();

  const [selectedMuscle, setSelectedMuscle] = useState<string>(currentExercise.targetMuscle || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyCompatible, setOnlyCompatible] = useState(true);
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Filter exercises
  const candidateExercises = useMemo(() => {
    const list: Exercise[] = Array.isArray(exercisesData) ? exercisesData : [];

    return list.filter((ex) => {
      // Don't suggest the current exercise
      if (ex.name.trim().toLowerCase() === currentExercise.exerciseName.trim().toLowerCase()) {
        return false;
      }

      // Muscle group filter
      if (selectedMuscle !== 'all' && ex.targetMuscle.toLowerCase() !== selectedMuscle.toLowerCase()) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = ex.name.toLowerCase().includes(query);
        const matchesMuscle = ex.targetMuscle.toLowerCase().includes(query);
        const matchesEquipment = ex.equipment.toLowerCase().includes(query);
        if (!matchesName && !matchesMuscle && !matchesEquipment) return false;
      }

      // Inventory compatibility filter
      if (onlyCompatible) {
        if (!isExerciseCompatibleWithEquipment(ex, equipmentList)) {
          return false;
        }
      }

      return true;
    });
  }, [exercisesData, currentExercise, selectedMuscle, searchQuery, onlyCompatible, equipmentList]);

  if (!isOpen) return null;

  const handleSelectExercise = async (newEx: Exercise) => {
    try {
      setSwapError(null);
      await swapExercise({
        dayNumber,
        exerciseIndex,
        newExerciseId: newEx._id,
      });
      onClose();
    } catch (err: any) {
      setSwapError(err.message || 'Failed to swap exercise movement');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <div className="bg-[#141721] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-kaizen-border bg-kaizen-bg/60">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-control bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <RefreshCw size={16} className={isSwapping ? 'animate-spin' : ''} />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-kaizen-text tracking-tight">
                  Swap Exercise Movement
                </h2>
                <p className="text-xs text-kaizen-muted font-mono">
                  Day {dayNumber} • Exercise #{exerciseIndex + 1}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-control text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Exercise Banner */}
          <div className="p-3.5 sm:p-4 bg-kaizen-surface/80 border-b border-kaizen-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider block">
                Currently Prescribed Movement:
              </span>
              <div className="text-sm font-bold text-kaizen-text flex items-center gap-2 mt-0.5">
                {currentExercise.exerciseName}
                <Badge variant="cyan" size="sm" className="capitalize text-[10px]">
                  {currentExercise.targetMuscle}
                </Badge>
                <Badge variant="neutral" size="sm" className="capitalize text-[10px]">
                  {currentExercise.equipment}
                </Badge>
              </div>
            </div>
            <div className="text-xs font-mono text-kaizen-muted sm:text-right">
              Target: <span className="text-kaizen-text font-bold">{currentExercise.targetSets} × {currentExercise.targetReps}</span>
              {currentExercise.suggestedWeightKg > 0 && (
                <span className="text-emerald-400 font-bold ml-1.5">({currentExercise.suggestedWeightKg}kg)</span>
              )}
            </div>
          </div>

          {/* Controls: Muscle filter & search */}
          <div className="p-3 sm:p-4 border-b border-kaizen-border bg-kaizen-bg/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-kaizen-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search alternative exercises..."
                  className="pl-8 text-xs py-1.5"
                />
              </div>

              <button
                type="button"
                onClick={() => setOnlyCompatible(!onlyCompatible)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-control border text-xs font-mono transition-colors shrink-0 ${
                  onlyCompatible
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-kaizen-surface border-kaizen-border text-kaizen-muted hover:text-kaizen-text'
                }`}
                title="When enabled, only displays exercises you have the hardware to perform"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Inventory Safe</span>
              </button>
            </div>

            {/* Muscle pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMuscle(m.id)}
                  className={`px-2.5 py-1 rounded-control font-mono text-[11px] whitespace-nowrap transition-colors ${
                    selectedMuscle === m.id
                      ? 'bg-kaizen-primary text-black font-bold shadow-sm'
                      : 'bg-kaizen-surface border border-kaizen-border text-kaizen-muted hover:text-kaizen-text'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error notice if any */}
          {swapError && (
            <div className="m-3 p-3 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle size={15} className="shrink-0" />
              <span>{swapError}</span>
            </div>
          )}

          {/* Alternative Exercises List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-kaizen-border/30">
            {isLoading ? (
              <div className="py-12 text-center text-xs font-mono text-kaizen-muted">
                Loading exercise catalog...
              </div>
            ) : candidateExercises.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-kaizen-subtle mx-auto" />
                <p className="text-xs font-mono text-kaizen-muted">
                  No matching compatible movements found.
                </p>
                <p className="text-[11px] text-kaizen-subtle">
                  Try switching the muscle filter, clearing the search query, or toggling "Inventory Safe".
                </p>
              </div>
            ) : (
              candidateExercises.map((ex) => {
                const isCompatible = isExerciseCompatibleWithEquipment(ex, equipmentList);

                return (
                  <div
                    key={ex._id}
                    className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-kaizen-surface/40 hover:bg-kaizen-surface/80 rounded-structural border border-kaizen-border/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-kaizen-text">{ex.name}</h4>
                        <Badge variant="cyan" size="sm" className="capitalize text-[10px]">
                          {ex.targetMuscle}
                        </Badge>
                        <Badge
                          variant={isCompatible ? 'neutral' : 'amber'}
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {ex.equipment}
                        </Badge>
                        {!isCompatible && (
                          <Badge variant="amber" size="sm" className="text-[10px]">
                            Requires Equipment
                          </Badge>
                        )}
                      </div>

                      {ex.instructions && (
                        <p className="text-[11px] text-kaizen-muted line-clamp-1 max-w-lg">
                          {ex.instructions}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {ex.videoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewExercise(ex)}
                          className="text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 py-1 px-2 h-auto"
                        >
                          <Play size={12} className="fill-current" />
                          <span className="hidden xs:inline">Preview</span>
                        </Button>
                      )}

                      <Button
                        variant={isCompatible ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handleSelectExercise(ex)}
                        disabled={isSwapping || !isCompatible}
                        className="text-xs gap-1.5 py-1 px-3 h-auto"
                      >
                        <Check size={13} />
                        Select
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-kaizen-border bg-kaizen-bg/60 flex items-center justify-between text-[11px] font-mono text-kaizen-muted">
            <span>{candidateExercises.length} compatible movements</span>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Video Preview Modal */}
      {previewExercise && (
        <ExerciseVideoModal
          exercise={previewExercise}
          isOpen={!!previewExercise}
          onClose={() => setPreviewExercise(null)}
        />
      )}
    </>
  );
};
