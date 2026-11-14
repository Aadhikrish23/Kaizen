import React from 'react';
import { Target } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useGoalHistory, useGoalProgress } from '../../services/goalService';

const kg = (n: number | null) => (n === null ? '-' : `${n} kg`);
const perWeek = (n: number | null) => (n === null ? 'n/a' : `${n > 0 ? '+' : ''}${n} kg/week`);

export const GoalProgressCard: React.FC = () => {
  const { data, isLoading } = useGoalProgress();
  const { data: history = [] } = useGoalHistory();
  if (isLoading || !data) return null;

  return (
    <Card title="Goal progress" subtitle="Start, current and target weight" action={<Target className="w-4 h-4 text-violet-400" />}>
      {data.status === 'no_target' ? (
        <p className="text-sm text-kaizen-muted">{data.message} You can set one in Profile Settings.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-[10px] font-mono uppercase text-kaizen-subtle">Start</p><p className="font-mono text-kaizen-text">{kg(data.startWeightKg)}</p></div>
            <div><p className="text-[10px] font-mono uppercase text-kaizen-subtle">Current</p><p className="font-mono text-kaizen-text">{kg(data.currentWeightKg)}</p></div>
            <div><p className="text-[10px] font-mono uppercase text-kaizen-subtle">Target</p><p className="font-mono text-kaizen-text">{kg(data.targetWeightKg)}{data.targetDate ? ` by ${data.targetDate}` : ''}</p></div>
          </div>

          {data.percentComplete !== null && (
            <div>
              <div className="h-2.5 w-full bg-kaizen-bg rounded-full overflow-hidden border border-kaizen-border" role="progressbar" aria-valuenow={data.percentComplete} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to goal">
                <div className="h-full bg-violet-500" style={{ width: `${data.percentComplete}%` }} />
              </div>
              <p className="text-[11px] font-mono text-kaizen-subtle mt-1">{data.percentComplete}% complete{data.remainingKg !== null ? `, ${data.remainingKg} kg to go` : ''}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <p className="text-kaizen-muted">Required pace: <span className="text-kaizen-text">{perWeek(data.requiredWeeklyChangeKg)}</span></p>
            <p className="text-kaizen-muted">Actual pace: <span className="text-kaizen-text">{perWeek(data.actualWeeklyChangeKg)}</span></p>
            {data.estimatedDate && <p className="text-kaizen-muted col-span-2">Estimated date at this pace: <span className="text-kaizen-text">{data.estimatedDate}</span></p>}
          </div>
          <p className={`text-xs font-mono ${data.status === 'not_enough_data' ? 'text-amber-300' : data.onTrack === false ? 'text-rose-300' : 'text-emerald-300'}`}>{data.message}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-kaizen-border">
          <p className="text-[10px] font-mono uppercase tracking-wider text-kaizen-subtle mb-1">Goal history</p>
          <ul className="space-y-1">
            {history.slice(0, 5).map((h) => (
              <li key={h._id} className="text-[11px] font-mono text-kaizen-muted">
                {new Date(h.createdAt).toLocaleDateString()}: {h.goal ? h.goal.replace('_', ' ') : 'no goal'}, target {h.targetWeightKg ?? '-'} kg{h.targetDate ? ` by ${h.targetDate}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};
