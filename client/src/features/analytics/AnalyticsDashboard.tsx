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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kaizen-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-kaizen-text">Data & Analytics</h2>
          <p className="text-xs text-kaizen-muted mt-0.5 font-mono">Visualize your journey</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-kaizen-surface border border-kaizen-border rounded-control px-3 py-1.5 text-sm font-mono text-kaizen-text focus:border-kaizen-primary outline-none"
        >
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-4 h-4 text-kaizen-calories" />
            <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider">Avg Calories</span>
          </div>
          <span className="text-2xl font-bold font-mono text-kaizen-text">{avgCalories}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider">Avg Protein</span>
          </div>
          <span className="text-2xl font-bold font-mono text-kaizen-text">{avgProtein}g</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-4 h-4 text-kaizen-workout" />
            <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider">Workouts</span>
          </div>
          <span className="text-2xl font-bold font-mono text-kaizen-text">{totalWorkouts}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-kaizen-water" />
            <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider">Adherence</span>
          </div>
          <span className="text-2xl font-bold font-mono text-kaizen-text">
            {chartData.filter((d:any) => d.waterAmount >= 2500).length} <span className="text-sm">days</span>
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Caloric Intake Trend */}
        <Card title="Caloric Intake" subtitle="Daily calories consumed">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3340" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C212B', borderColor: '#2D3340', borderRadius: '8px' }}
                  itemStyle={{ color: '#F59E0B' }}
                />
                <Area type="monotone" dataKey="calories" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorCalories)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Weight Trend */}
        <Card title="Body Weight" subtitle="Scale fluctuations">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3340" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C212B', borderColor: '#2D3340', borderRadius: '8px' }}
                  itemStyle={{ color: '#EC4899' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#EC4899" strokeWidth={3} dot={{ r: 4, fill: '#1C212B', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Workout Volume */}
        <Card title="Workout Volume" subtitle="Total kg lifted per session">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3340" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C212B', borderColor: '#2D3340', borderRadius: '8px' }}
                  cursor={{ fill: '#2D3340' }}
                />
                <Bar dataKey="workoutVolume" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Macros Breakdown */}
        <Card title="Macro Balance" subtitle="Protein vs Carbs vs Fat">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3340" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1C212B', borderColor: '#2D3340', borderRadius: '8px' }} />
                <Legend />
                <Area type="monotone" dataKey="protein" stackId="1" stroke="#34D399" fill="#34D399" />
                <Area type="monotone" dataKey="carbs" stackId="1" stroke="#60A5FA" fill="#60A5FA" />
                <Area type="monotone" dataKey="fat" stackId="1" stroke="#F472B6" fill="#F472B6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
