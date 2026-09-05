import { useState } from 'react';
import { LayoutDashboard, Dumbbell, Utensils, Droplets, Scale, Calendar as CalendarIcon, LogOut } from 'lucide-react';
import { DashboardOverview } from '../features/dashboard/DashboardOverview';
import { WorkoutTracker } from '../features/workouts/WorkoutTracker';
import { MealTracker } from '../features/meals/MealTracker';
import { WaterTracker } from '../features/water/WaterTracker';
import { WeightTracker } from '../features/weight/WeightTracker';
import { useAuth } from '../contexts/AuthContext';

type NavigationTab = 'dashboard' | 'workouts' | 'meals' | 'water' | 'weight';

export const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const { logout, user } = useAuth();
  
  // Format today's date as YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [currentDate, setCurrentDate] = useState<string>(getTodayString());

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workouts' as const, label: 'Workouts', icon: Dumbbell, highlight: 'text-kaizen-workout' },
    { id: 'meals' as const, label: 'Nutrition', icon: Utensils, highlight: 'text-kaizen-calories' },
    { id: 'water' as const, label: 'Hydration', icon: Droplets, highlight: 'text-kaizen-water' },
    { id: 'weight' as const, label: 'Scale Weight', icon: Scale, highlight: 'text-kaizen-weight' },
  ];

  return (
    <div className="min-h-screen bg-kaizen-bg text-kaizen-text flex flex-col md:flex-row antialiased">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-kaizen-surface border-r border-kaizen-border p-5 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-control bg-kaizen-primary/10 border border-kaizen-primary/20 flex items-center justify-center text-kaizen-primary font-bold font-mono">
              K
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-kaizen-text">Kaizen</h1>
              <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider block">Health & Strength</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-kaizen-surface-elevated text-kaizen-text font-semibold border border-kaizen-border'
                      : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive && item.highlight ? item.highlight : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {/* User & Logout */}
          <div className="mb-4 px-3 flex items-center justify-between">
             <div className="text-sm font-medium">{user?.firstName || 'User'}</div>
             <button onClick={logout} className="text-kaizen-muted hover:text-kaizen-text" title="Logout">
               <LogOut className="w-4 h-4" />
             </button>
          </div>
          {/* Date Selector in Sidebar */}
          <div className="pt-4 border-t border-kaizen-border/60">
            <label className="text-[11px] font-mono text-kaizen-subtle uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-kaizen-muted" /> Active Date
            </label>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="w-full bg-kaizen-bg border border-kaizen-border rounded-control px-2.5 py-1.5 text-xs font-mono text-kaizen-text focus:border-kaizen-primary outline-none"
            />
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between p-4 bg-kaizen-surface border-b border-kaizen-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-control bg-kaizen-primary/10 border border-kaizen-primary/20 flex items-center justify-center text-kaizen-primary font-bold font-mono text-sm">
            K
          </div>
          <span className="font-bold text-sm tracking-tight">Kaizen</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="bg-kaizen-bg border border-kaizen-border rounded-control px-2 py-1 text-xs font-mono text-kaizen-text"
          />
          <button onClick={logout} className="p-1 text-kaizen-muted">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            currentDate={currentDate}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'workouts' && (
          <WorkoutTracker currentDate={currentDate} />
        )}
        {activeTab === 'meals' && (
          <MealTracker currentDate={currentDate} />
        )}
        {activeTab === 'water' && (
          <WaterTracker currentDate={currentDate} />
        )}
        {activeTab === 'weight' && (
          <WeightTracker currentDate={currentDate} />
        )}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-kaizen-surface/95 backdrop-blur-md border-t border-kaizen-border flex justify-around p-2 z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1.5 text-[10px] font-mono transition-colors ${
                isActive ? 'text-kaizen-primary font-bold' : 'text-kaizen-subtle hover:text-kaizen-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
