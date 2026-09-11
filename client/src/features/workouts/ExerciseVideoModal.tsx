import React from 'react';
import { X, Play, CheckCircle2, Dumbbell, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Exercise } from '../../types';

interface ExerciseVideoModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToWorkout?: (exercise: Exercise) => void;
}

export const ExerciseVideoModal: React.FC<ExerciseVideoModalProps> = ({
  exercise,
  isOpen,
  onClose,
  onAddToWorkout,
}) => {
  if (!isOpen || !exercise) return null;

  const tipTitles = [
    'Setup & Body Alignment',
    'Execution & Breathing Path',
    'Critical Mistakes to Avoid',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141721] border border-slate-800/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0C0E14]/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Play size={16} />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">{exercise.name}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="emerald" className="capitalize text-xs">
                {exercise.targetMuscle}
              </Badge>
              <Badge variant="neutral" className="capitalize text-xs text-slate-300">
                {exercise.equipment}
              </Badge>
              {exercise.difficulty && (
                <Badge
                  variant={
                    exercise.difficulty === 'beginner'
                      ? 'emerald'
                      : exercise.difficulty === 'intermediate'
                      ? 'amber'
                      : 'rose'
                  }
                  className="capitalize text-xs"
                >
                  {exercise.difficulty}
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Video Player */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/90 border border-slate-800 shadow-xl">
            {exercise.videoUrl ? (
              <iframe
                src={`${exercise.videoUrl}?autoplay=1&mute=1&rel=0`}
                title={`${exercise.name} Live Demo`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : exercise.gifUrl ? (
              <img
                src={exercise.gifUrl}
                alt={exercise.name}
                className="w-full h-full object-contain bg-[#0C0E14]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <Dumbbell size={40} className="text-slate-600 animate-pulse" />
                <p className="text-sm font-medium text-slate-400">Video Demonstration</p>
                <p className="text-xs text-slate-500">Live feed preview unavailable in offline mode</p>
              </div>
            )}
          </div>

          {/* Form Breakdown / Step-by-Step Cues */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Form Breakdown & Execution Cues
            </h3>

            {exercise.formTips && exercise.formTips.length > 0 ? (
              <div className="space-y-2.5">
                {exercise.formTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#0C0E14] border border-slate-800/80 flex items-start gap-3 text-sm"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-emerald-400/90 uppercase tracking-wide">
                        {tipTitles[idx] || `Checkpoint ${idx + 1}`}
                      </p>
                      <p className="text-slate-300 leading-relaxed">{tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : exercise.instructions ? (
              <div className="p-4 rounded-xl bg-[#0C0E14] border border-slate-800/80 text-sm text-slate-300 leading-relaxed">
                {exercise.instructions}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0C0E14] border border-slate-800/80 text-sm text-slate-400 italic">
                Perform this movement smoothly through a full active range of motion, controlling both the concentric push/pull and eccentric return.
              </div>
            )}
          </div>

          {/* Secondary Muscles */}
          {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-500 font-medium">Synergist / Secondary Muscles:</span>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondaryMuscles.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 capitalize text-[11px]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0C0E14]/40 flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>

          {onAddToWorkout && (
            <Button
              variant="primary"
              onClick={() => {
                onAddToWorkout(exercise);
                onClose();
              }}
              className="gap-2"
            >
              <Plus size={16} />
              Add to Active Session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
