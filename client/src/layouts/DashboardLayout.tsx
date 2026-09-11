import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Utensils, Droplets, Moon, Calendar, LogOut, Settings, BarChart3, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardOverview } from '../features/dashboard/DashboardOverview';
import { WorkoutTracker } from '../features/workouts/WorkoutTracker';
import { AdaptivePlannerView } from '../features/planner/AdaptivePlannerView';
import { InventoryView } from '../features/inventory/InventoryView';
import { MealTracker } from '../features/meals/MealTracker';
import { WaterTracker } from '../features/water/WaterTracker';
import { SleepTracker } from '../features/sleep/SleepTracker';
import { WeightTracker } from '../features/weight/WeightTracker';
import { AnalyticsDashboard } from '../features/analytics/AnalyticsDashboard';
import { useAuth } from '../contexts/AuthContext';

type NavigationTab = 'dashboard' | 'workouts' | 'meals' | 'water' | 'sleep' | 'analytics' | 'weight';
type WorkoutSubTab = 'tracker' | 'planner' | 'inventory';

export const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [workoutSubTab, setWorkoutSubTab] = useState<WorkoutSubTab>('tracker');
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

  // Date stepper handlers
  const shiftDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setCurrentDate(`${year}-${month}-${day}`);
  };

  const isToday = currentDate === getTodayString();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'KZ';

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, accent: 'text-emerald-400' },
    { id: 'workouts' as const, label: 'Workouts', icon: Dumbbell, accent: 'text-rose-400' },
    { id: 'meals' as const, label: 'Nutrition', icon: Utensils, accent: 'text-amber-400' },
    { id: 'water' as const, label: 'Hydration', icon: Droplets, accent: 'text-cyan-400' },
    { id: 'sleep' as const, label: 'Sleep Cycle', icon: Moon, accent: 'text-indigo-400' },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, accent: 'text-emerald-400' },
  ];

  return (
    <div className="min-h-screen bg-kaizen-bg text-kaizen-text flex flex-col md:flex-row antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-kaizen-surface border-r border-kaizen-border p-4 shrink-0 justify-between relative z-20">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-control bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold font-display text-lg tracking-wider shadow-glow-emerald">
              KZ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-base tracking-wide text-white">KAIZEN</h1>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-widest block">Performance OS</span>
            </div>
          </div>

          {/* Active Date Stepper Card */}
          <div className="bg-kaizen-bg/80 border border-kaizen-border rounded-control p-2.5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-kaizen-muted" /> Active Log
              </span>
              {!isToday && (
                <button
                  onClick={() => setCurrentDate(getTodayString())}
                  className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 transition-colors"
                >
                  Jump Today
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded hover:bg-kaizen-surface text-kaizen-muted hover:text-white transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="w-full bg-kaizen-surface border border-kaizen-border rounded px-2 py-1 text-xs font-mono text-kaizen-text focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 outline-none text-center cursor-pointer"
              />
              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 rounded hover:bg-kaizen-surface text-kaizen-muted hover:text-white transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-control text-sm font-medium transition-all duration-150 group relative ${
                      isActive
                        ? 'bg-kaizen-surface-elevated text-white font-semibold border border-kaizen-border shadow-subtle'
                        : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? item.accent : 'group-hover:text-kaizen-text'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow-emerald"></span>
                    )}
                  </button>

                  {/* Sub-items under Workouts */}
                  {item.id === 'workouts' && activeTab === 'workouts' && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-rose-500/40 ml-4 my-1.5 animate-fadeIn">
                      <button
                        onClick={() => setWorkoutSubTab('tracker')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-control text-xs font-mono transition-all ${
                          workoutSubTab === 'tracker'
                            ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30 shadow-sm'
                            : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/50'
                        }`}
                      >
                        <Dumbbell className="w-3 h-3 text-rose-400" />
                        <span>Active Session</span>
                      </button>
                      <button
                        onClick={() => setWorkoutSubTab('planner')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-control text-xs font-mono transition-all ${
                          workoutSubTab === 'planner'
                            ? 'bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm'
                            : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/50'
                        }`}
                      >
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span>Workout Planner</span>
                        <span className="sr-only">Adaptive Planner</span>
                      </button>
                      <button
                        onClick={() => setWorkoutSubTab('inventory')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-control text-xs font-mono transition-all ${
                          workoutSubTab === 'inventory'
                            ? 'bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30 shadow-sm'
                            : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/50'
                        }`}
                      >
                        <Package className="w-3 h-3 text-amber-400" />
                        <span>Equipment Inventory</span>
                        <span className="sr-only">& Equipment & Inventory</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Footer Card */}
        <div className="pt-4 border-t border-kaizen-border">
          <div className="flex items-center justify-between p-2 rounded-control bg-kaizen-bg/60 border border-kaizen-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-control bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Athlete'}</p>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Synced
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/settings/profile"
                className="p-1.5 rounded hover:bg-kaizen-surface-hover text-kaizen-muted hover:text-white transition-colors"
                title="Profile Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={logout}
                className="p-1.5 rounded hover:bg-rose-500/10 text-kaizen-muted hover:text-rose-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="flex md:hidden items-center justify-between p-3.5 bg-kaizen-surface/95 backdrop-blur-md border-b border-kaizen-border sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-control bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold font-display text-base">
            KZ
          </div>
          <div>
            <span className="font-display font-extrabold text-sm tracking-wide text-white block">KAIZEN</span>
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider block">Performance</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="bg-kaizen-bg border border-kaizen-border rounded-control px-2 py-1 text-xs font-mono text-kaizen-text focus:border-emerald-500 outline-none"
          />
          <Link
            to="/settings/profile"
            className="p-1.5 rounded-control text-kaizen-muted hover:text-white bg-kaizen-bg border border-kaizen-border"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={logout}
            className="p-1.5 rounded-control text-kaizen-muted hover:text-rose-400 bg-kaizen-bg border border-kaizen-border"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            currentDate={currentDate}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'workouts') setWorkoutSubTab('tracker');
            }}
          />
        )}
        {activeTab === 'workouts' && (
          <div className="space-y-6">
            {/* Workouts Top Sub-Navigation Bar */}
            <div className="flex items-center gap-2 p-1.5 bg-kaizen-surface border border-kaizen-border rounded-control overflow-x-auto shadow-subtle">
              <button
                onClick={() => setWorkoutSubTab('tracker')}
                className={`px-4 py-2 rounded-control text-xs font-mono font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  workoutSubTab === 'tracker'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                    : 'text-kaizen-muted hover:text-white hover:bg-kaizen-surface-hover/50'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5 text-rose-400" />
                <span>Active Session</span>
              </button>
              <button
                onClick={() => setWorkoutSubTab('planner')}
                className={`px-4 py-2 rounded-control text-xs font-mono font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  workoutSubTab === 'planner'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-kaizen-muted hover:text-white hover:bg-kaizen-surface-hover/50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Workout Planner</span>
                <span className="sr-only">Adaptive Planner</span>
              </button>
              <button
                onClick={() => setWorkoutSubTab('inventory')}
                className={`px-4 py-2 rounded-control text-xs font-mono font-semibold transition-all flex items-center gap-2 shrink-0 ${
                  workoutSubTab === 'inventory'
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-sm'
                    : 'text-kaizen-muted hover:text-white hover:bg-kaizen-surface-hover/50'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Equipment Inventory</span>
                <span className="sr-only">& Equipment & Inventory</span>
              </button>
            </div>

            {/* Sub-tab view render */}
            {workoutSubTab === 'tracker' && (
              <WorkoutTracker
                currentDate={currentDate}
                onNavigateToPlanner={() => setWorkoutSubTab('planner')}
              />
            )}
            {workoutSubTab === 'planner' && (
              <AdaptivePlannerView
                currentDate={currentDate}
                onNavigateToWorkouts={() => setWorkoutSubTab('tracker')}
              />
            )}
            {workoutSubTab === 'inventory' && (
              <InventoryView />
            )}
          </div>
        )}
        {activeTab === 'meals' && (
          <MealTracker currentDate={currentDate} />
        )}
        {activeTab === 'water' && (
          <WaterTracker currentDate={currentDate} />
        )}
        {activeTab === 'sleep' && (
          <SleepTracker currentDate={currentDate} />
        )}
        {activeTab === 'weight' && (
          <WeightTracker currentDate={currentDate} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-kaizen-surface/95 backdrop-blur-lg border-t border-kaizen-border flex justify-around p-2 z-50 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-control text-[10px] font-mono transition-all ${
                isActive
                  ? 'text-white font-bold bg-kaizen-surface-elevated border border-kaizen-border shadow-subtle'
                  : 'text-kaizen-subtle hover:text-kaizen-muted'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? item.accent : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
