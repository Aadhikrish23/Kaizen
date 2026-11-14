import React from 'react';
import { CalendarRange } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useWeeklyInsight } from '../../services/aiService';

export const WeeklyInsightCard: React.FC = () => {
  const { data, isLoading, isError } = useWeeklyInsight();

  return (
    <Card title="Weekly insight" subtitle="Your last 7 days at a glance" action={<CalendarRange className="w-4 h-4 text-kaizen-muted" />}>
      {isLoading ? (
        <p className="text-xs font-mono text-kaizen-muted">Summarising your week...</p>
      ) : isError || !data ? (
        <p className="text-xs font-mono text-kaizen-muted">Weekly insight is unavailable right now.</p>
      ) : (
        <div className="space-y-3">
          <p className={`text-sm ${data.sufficient ? 'text-kaizen-text' : 'text-kaizen-muted'}`}>{data.insight}</p>
          {data.highlights.length > 0 && (
            <ul className="space-y-1">
              {data.highlights.map((h) => (
                <li key={h} className="text-[11px] font-mono text-kaizen-subtle">- {h}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
};
