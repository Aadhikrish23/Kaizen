import React from 'react';
import { Lock, Trophy, X } from 'lucide-react';
import { AchievementStatus } from '../../services/gamificationService';

interface AchievementsModalProps {
  achievements: AchievementStatus[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ achievements, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Achievements" onClick={onClose}>
    <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-kaizen-surface border border-kaizen-border rounded-structural p-5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Achievements</h2>
        <button onClick={onClose} aria-label="Close" className="text-kaizen-muted hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <ul className="space-y-2">
        {achievements.map((a) => (
          <li key={a.key} className={`p-3 rounded-control border ${a.unlocked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-kaizen-border bg-kaizen-bg'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${a.unlocked ? 'text-white' : 'text-kaizen-muted'}`}>
                {a.unlocked ? <Trophy className="inline w-3.5 h-3.5 mr-1.5 text-amber-400" /> : <Lock className="inline w-3.5 h-3.5 mr-1.5" />}
                {a.title}
              </span>
              <span className="text-[11px] font-mono text-kaizen-subtle">
                {a.unlocked ? (a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString() : 'Unlocked') : `${a.progress} / ${a.target}`}
              </span>
            </div>
            <p className="text-[11px] text-kaizen-subtle mt-0.5">{a.description}</p>
            {!a.unlocked && (
              <div className="mt-2 h-1.5 w-full bg-kaizen-bg rounded-full overflow-hidden border border-kaizen-border">
                <div className="h-full bg-kaizen-primary" style={{ width: `${Math.round((a.progress / a.target) * 100)}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  </div>
);
