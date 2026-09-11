import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAnalytics } from '../../services/analyticsService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { Activity, Droplets, Dumbbell, Utensils } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAnalytics(days);

  if (isLoading) return <LoadingState message="Loading insights..." />;
  if (error || !data) return <div className="text-rose-400 p-4">Failed to load analytics</div>;

  const { dailyStats, avgCalories, avgProtein, totalWorkouts } = data;

  // Format date for charts
  const chartData = dailyStats.map((d: any) => {
    const dateObj = new Date(d.date);
    return {
      ...d,
      displayDate: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
    };
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">Performance Telemetry & Analytics</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Longitudinal metabolic, strength, and biometric trends</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-kaizen-subtle uppercase">Window:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-kaizen-surface border border-kaizen-border rounded-control px-3 py-1.5 text-xs font-mono text-white focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 outline-none cursor-pointer shadow-subtle"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-center card-sheen shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Utensils className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider">Avg Calories</span>
          </div>
          <span className="text-3xl font-bold font-mono text-amber-400">{avgCalories} <span className="text-xs text-kaizen-muted font-normal">kcal</span></span>
        </Card>

        <Card className="p-4 flex flex-col justify-center card-sheen shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider">Avg Protein</span>
          </div>
          <span className="text-3xl font-bold font-mono text-emerald-400">{avgProtein}<span className="text-xs font-normal">g</span></span>
        </Card>

        <Card className="p-4 flex flex-col justify-center card-sheen shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Dumbbell className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider">Total Sessions</span>
          </div>
          <span className="text-3xl font-bold font-mono text-rose-400">{totalWorkouts}</span>
        </Card>

        <Card className="p-4 flex flex-col justify-center card-sheen shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider">Hydration Adherence</span>
          </div>
          <span className="text-3xl font-bold font-mono text-cyan-400">
            {chartData.filter((d: any) => d.waterAmount >= 2500).length} <span className="text-xs text-kaizen-muted font-normal">days target</span>
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Caloric Intake Trend */}
        <Card title="Caloric Intake Curve" subtitle="Daily calories consumed vs metabolic burn" className="card-sheen shadow-subtle">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222A3C" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                <YAxis stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131722', borderColor: '#222A3C', borderRadius: '8px', color: '#F1F3F7' }}
                  itemStyle={{ color: '#FBBF24' }}
                />
                <Area type="monotone" dataKey="calories" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorCalories)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Weight Trend */}
        <Card title="Body Composition Trend" subtitle="Scale fluctuations and fluid variance" className="card-sheen shadow-subtle">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222A3C" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                <YAxis stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} font-family="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131722', borderColor: '#222A3C', borderRadius: '8px', color: '#F1F3F7' }}
                  itemStyle={{ color: '#A78BFA' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: '#131722', strokeWidth: 2, stroke: '#8B5CF6' }} activeDot={{ r: 6, fill: '#8B5CF6' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Workout Volume */}
        <Card title="Training Volume Load" subtitle="Total tonnage lifted per recorded workout session" className="card-sheen shadow-subtle">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222A3C" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                <YAxis stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131722', borderColor: '#222A3C', borderRadius: '8px', color: '#F1F3F7' }}
                  cursor={{ fill: 'rgba(244, 63, 94, 0.08)' }}
                  itemStyle={{ color: '#FB7185' }}
                />
                <Bar dataKey="workoutVolume" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Macros Breakdown */}
        <Card title="Macronutrient Balance Ratio" subtitle="Stacked ratio: Protein (Emerald), Carbs (Cyan), Fat (Amber)" className="card-sheen shadow-subtle">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222A3C" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                <YAxis stroke="#717E93" fontSize={11} tickLine={false} axisLine={false} font-family="JetBrains Mono" />
                <Tooltip contentStyle={{ backgroundColor: '#131722', borderColor: '#222A3C', borderRadius: '8px', color: '#F1F3F7' }} />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="protein" name="Protein (g)" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="carbs" name="Carbs (g)" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.6} />
                <Area type="monotone" dataKey="fat" name="Fat (g)" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
