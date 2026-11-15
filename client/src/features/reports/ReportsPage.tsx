import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import { Adherence, ReportPeriod, useReport } from '../../services/reportService';
import { parseLocalDate } from '../../utils/date';

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const Stat: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="p-3 rounded-control border border-kaizen-border bg-kaizen-bg">
    <p className="text-[10px] font-mono uppercase tracking-wider text-kaizen-subtle">{label}</p>
    <p className="text-xl font-mono font-bold text-kaizen-text mt-0.5">{value}</p>
    {sub && <p className="text-[11px] font-mono text-kaizen-muted mt-0.5">{sub}</p>}
  </div>
);

const adherence = (label: string, a: Adherence | null, unit: string) =>
  a ? <Stat label={label} value={`${a.average} ${unit}`} sub={`${a.adherencePct}% of ${a.target} ${unit} target, ${a.loggedDays} logged day${a.loggedDays === 1 ? '' : 's'}`} /> : <Stat label={label} value="No data" />;

// Reports for a period ending on the selected date. Averages cover logged days only; thin periods show a
// not-enough-data statement instead of zero-filled numbers.
export const ReportsPage: React.FC<{ currentDate: string }> = ({ currentDate }) => {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const { data, isLoading, isError } = useReport(period, currentDate);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">Reports</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Totals and averages over the days you actually logged</p>
        </div>
        <div className="flex bg-kaizen-surface p-1 rounded-control border border-kaizen-border" role="tablist" aria-label="Report period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-control ${period === p.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-kaizen-muted hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Building your report..." />
      ) : isError || !data ? (
        <Card title="Report"><p className="text-xs font-mono text-kaizen-muted">The report is unavailable right now.</p></Card>
      ) : (
        <>
          <p className="text-xs font-mono text-kaizen-muted">
            {data.startDate} to {data.endDate} | {data.daysWithData} of {data.daysInPeriod} day{data.daysInPeriod === 1 ? '' : 's'} with data
          </p>

          {!data.sufficient ? (
            <Card title="Not enough data">
              <p className="text-sm text-kaizen-text">{data.notEnoughData}</p>
              {data.missing.length > 0 && <p className="text-[11px] font-mono text-kaizen-subtle mt-2">Nothing logged for: {data.missing.join(', ')}.</p>}
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {adherence('Calories (avg)', data.calories, 'kcal')}
                {adherence('Protein (avg)', data.protein, 'g')}
                {adherence('Water (avg)', data.water, 'ml')}
                {data.workouts ? (
                  <Stat label="Workouts" value={String(data.workouts.count)} sub={`${data.workouts.daysWithWorkout} day(s), ${data.workouts.totalVolumeKg} kg volume`} />
                ) : (
                  <Stat label="Workouts" value="No data" />
                )}
                <Stat label="Sleep (avg)" value={data.sleep ? `${data.sleep.averageHours} h` : 'No data'} sub={data.sleep ? `${data.sleep.loggedNights} logged night(s)` : undefined} />
                <Stat
                  label="Weight change"
                  value={data.weight ? `${data.weight.changeKg > 0 ? '+' : ''}${data.weight.changeKg} kg` : 'Not enough data'}
                  sub={data.weight ? `${data.weight.firstKg} to ${data.weight.lastKg} kg` : 'needs two weigh-ins'}
                />
              </div>
              {data.missing.length > 0 && <p className="text-[11px] font-mono text-kaizen-subtle">Nothing logged for: {data.missing.join(', ')}.</p>}

              {data.period !== 'daily' && data.calories && (
                <Card title="Calories per day" subtitle="Days without logs are left empty">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.days.map((d) => ({ label: `${parseLocalDate(d.date).getMonth() + 1}/${parseLocalDate(d.date).getDate()}`, calories: d.calories }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <ReferenceLine y={data.calories.target} stroke="#10b981" strokeDasharray="4 4" />
                        <Bar dataKey="calories" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
