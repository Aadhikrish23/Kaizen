import React, { useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useGamification } from '../../services/gamificationService';
import { AchievementsModal } from './AchievementsModal';

export const GamificationCard: React.FC = () => {
  const { data, isLoading, isError } = useGamification();
  const [open, setOpen] = useState(false);

  if (isLoading) return <Card title="Level & streak"><p className="text-xs font-mono text-kaizen-muted">Loading...</p></Card>;
  if (isError || !data) return <Card title="Level & streak"><p className="text-xs font-mono text-kaizen-muted">Progress is unavailable right now.</p></Card>;

  const { progress, streak, achievements } = data;
  const earned = achievements.filter((a) => a.unlocked).length;
  const empty = progress.xp === 0 && streak.longest === 0;

  return (
    <>
      <Card title="Level & streak" subtitle="Earned by logging real activity">
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-bold text-emerald-400">Lv {progress.level}</span>
              <span className="text-xs font-mono text-kaizen-muted">{progress.xp} XP</span>
            </div>
            <div
              className="mt-2 h-2.5 w-full bg-kaizen-bg rounded-full overflow-hidden border border-kaizen-border"
              role="progressbar"
              aria-valuenow={progress.percentToNext}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress to next level"
            >
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${progress.percentToNext}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-mono text-kaizen-subtle">
              {progress.xpIntoLevel} / {progress.xpForNextLevel} XP to level {progress.level + 1}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${streak.current > 0 ? 'text-amber-400' : 'text-kaizen-subtle'}`} />
            <span className="text-sm text-kaizen-text">
              {streak.current > 0 ? `${streak.current}-day streak` : 'No active streak'}
            </span>
            <span className="text-[11px] font-mono text-kaizen-subtle">best {streak.longest}</span>
          </div>
          {data.streakAtRisk && !streak.activeToday && (
            <p className="text-[11px] font-mono text-amber-300">Log something today to keep your streak.</p>
          )}
          {empty && <p className="text-[11px] font-mono text-kaizen-muted">Nothing earned yet. Log a meal, water, weight, sleep or a workout to start.</p>}

          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <Trophy className="w-3.5 h-3.5" /> Achievements ({earned}/{achievements.length})
          </Button>
        </div>
      </Card>
      {open && <AchievementsModal achievements={achievements} onClose={() => setOpen(false)} />}
    </>
  );
};
