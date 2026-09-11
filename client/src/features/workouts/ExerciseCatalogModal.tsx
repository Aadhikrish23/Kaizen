import React, { useState } from 'react';
import { X, Search, Dumbbell, Plus, Check, Sparkles, Play } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { useExercises, useAddExercise } from '../../services/exerciseService';
import { Exercise } from '../../types';
import { ExerciseVideoModal } from './ExerciseVideoModal';

interface ExerciseCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

const MUSCLE_TABS = [
  { id: '', label: 'All Muscles' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'core', label: 'Core' },
];

const EQUIPMENT_OPTIONS = [
  'all',
  'barbell',
  'dumbbell',
  'cable',
  'bodyweight',
  'machine',
] as const;

export const ExerciseCatalogModal: React.FC<ExerciseCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
}) => {
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedVideoExercise, setSelectedVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Custom Exercise Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<any>('chest');
  const [customEquipment, setCustomEquipment] = useState<any>('dumbbell');
  const [customInstructions, setCustomInstructions] = useState('');
  const [customError, setCustomError] = useState('');

  const { data: exercises, isLoading } = useExercises(selectedMuscle || undefined);
  const { mutateAsync: addExercise, isPending: isAddingCustom } = useAddExercise();

  if (!isOpen) return null;

  const filteredExercises = (exercises as Exercise[] | undefined)?.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEquipment = selectedEquipment === 'all' || ex.equipment.toLowerCase() === selectedEquipment.toLowerCase();
    return matchesSearch && matchesEquipment;
  });

  const handleSelect = (ex: Exercise) => {
    onSelectExercise(ex);
    setAddedIds((prev) => new Set(prev).add(ex._id));
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setCustomError('Exercise name is required');
      return;
    }

    try {
      setCustomError('');
      const created: any = await addExercise({
        name: customName.trim(),
        targetMuscle: customMuscle,
        equipment: customEquipment,
        instructions: customInstructions.trim(),
        difficulty: 'intermediate',
      });

      // Add to session right away
      if (created) {
        onSelectExercise(created);
      }

      setCustomName('');
      setCustomInstructions('');
      setShowCreateModal(false);
    } catch (err: any) {
      setCustomError(err?.message || 'Failed to create exercise');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-kaizen-surface border border-kaizen-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-kaizen-border bg-kaizen-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-kaizen-workout/10 border border-kaizen-workout/20 flex items-center justify-center text-kaizen-workout">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-kaizen-text tracking-tight">Exercise Library</h2>
              <p className="text-xs text-kaizen-muted font-mono">Offline Master Directory + Custom Movements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Custom
            </Button>
            <button
              onClick={onClose}
              aria-label="Close library"
              className="p-1.5 text-kaizen-muted hover:text-kaizen-text rounded-md hover:bg-kaizen-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-kaizen-border bg-kaizen-surface space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Input
              placeholder="Search exercise by name (e.g., Incline Press, RDL, Pull-Ups)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Search className="w-4 h-4 text-kaizen-muted absolute left-3 top-3" />
          </div>

          {/* Muscle Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {MUSCLE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedMuscle(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedMuscle === tab.id
                    ? 'bg-kaizen-workout text-white font-semibold'
                    : 'bg-kaizen-bg text-kaizen-muted hover:text-kaizen-text border border-kaizen-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Equipment Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-mono uppercase text-kaizen-muted mr-1">Equipment:</span>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => setSelectedEquipment(eq)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md capitalize transition-all ${
                  selectedEquipment === eq
                    ? 'bg-kaizen-surface-elevated text-kaizen-text border border-kaizen-border font-bold'
                    : 'text-kaizen-subtle hover:text-kaizen-muted'
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises Grid */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {isLoading && <LoadingState message="Loading exercises..." />}

          {!isLoading && (!filteredExercises || filteredExercises.length === 0) && (
            <div className="text-center py-12 text-kaizen-muted">
              <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No exercises found.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="mt-3"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add "{searchQuery}" as Custom Exercise
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredExercises?.map((ex) => {
              const isAdded = addedIds.has(ex._id);

              return (
                <div
                  key={ex._id}
                  className="bg-kaizen-bg border border-kaizen-border hover:border-kaizen-border/80 rounded-xl p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-kaizen-text tracking-tight">
                            {ex.name}
                          </h3>
                          {ex.userId && (
                            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono uppercase bg-kaizen-workout/10 text-kaizen-workout border border-kaizen-workout/20 px-2 py-0.5 rounded">
                            {ex.targetMuscle}
                          </span>
                          <span className="text-[10px] font-mono capitalize bg-kaizen-surface text-kaizen-muted border border-kaizen-border px-2 py-0.5 rounded">
                            {ex.equipment}
                          </span>
                          {ex.difficulty && (
                            <span className="text-[10px] font-mono capitalize text-kaizen-subtle">
                              • {ex.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {ex.instructions && (
                      <p className="text-xs text-kaizen-muted mt-2 line-clamp-2">
                        {ex.instructions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-kaizen-border/60">
                    <span className="text-[11px] text-kaizen-subtle font-mono">
                      {ex.secondaryMuscles && ex.secondaryMuscles.length > 0
                        ? `Secondary: ${ex.secondaryMuscles.join(', ')}`
                        : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideoExercise(ex);
                          setIsVideoModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20"
                        title="Watch form demonstration video"
                      >
                        <Play className="w-3 h-3 fill-current" /> Demo
                      </button>
                      <Button
                        variant={isAdded ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleSelect(ex)}
                        className="text-xs"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add to Session
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Create Custom Exercise */}
        {showCreateModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-kaizen-surface border border-kaizen-border rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-kaizen-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-kaizen-text">Create Custom Exercise</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close custom modal"
                  className="text-kaizen-muted hover:text-kaizen-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {customError && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {customError}
                </div>
              )}

              <form onSubmit={handleCreateCustom} className="space-y-3.5">
                <Input
                  label="Exercise Name"
                  placeholder="e.g., Cable Hammer Curl with Rope"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-kaizen-muted mb-1.5 uppercase">
                      Primary Muscle
                    </label>
                    <select
                      value={customMuscle}
                      onChange={(e) => setCustomMuscle(e.target.value)}
                      className="w-full bg-kaizen-bg border border-kaizen-border rounded-control px-3 py-2 text-xs text-kaizen-text focus:border-kaizen-primary outline-none"
                    >
                      {MUSCLE_TABS.filter((t) => t.id).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-kaizen-muted mb-1.5 uppercase">
                      Equipment
                    </label>
                    <select
                      value={customEquipment}
                      onChange={(e) => setCustomEquipment(e.target.value)}
                      className="w-full bg-kaizen-bg border border-kaizen-border rounded-control px-3 py-2 text-xs text-kaizen-text focus:border-kaizen-primary outline-none capitalize"
                    >
                      {EQUIPMENT_OPTIONS.filter((e) => e !== 'all').map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-kaizen-muted mb-1.5 uppercase">
                    Form Cues & Instructions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe execution cues, setup, tempo..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full bg-kaizen-bg border border-kaizen-border rounded-control p-2.5 text-xs text-kaizen-text focus:border-kaizen-primary outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-kaizen-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isAddingCustom}
                  >
                    {isAddingCustom ? 'Saving...' : 'Save & Add'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Video Player Modal */}
        <ExerciseVideoModal
          exercise={selectedVideoExercise}
          isOpen={isVideoModalOpen}
          onClose={() => {
            setIsVideoModalOpen(false);
            setSelectedVideoExercise(null);
          }}
          onAddToWorkout={(exercise) => handleSelect(exercise)}
        />
      </div>
    </div>
  );
};
