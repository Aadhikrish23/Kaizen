import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Utensils, Droplets, Moon, Calendar, LogOut, Settings, BarChart3, Package } from 'lucide-react';
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

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workouts' as const, label: 'Workouts', icon: Dumbbell, highlight: 'text-kaizen-workout' },
    { id: 'meals' as const, label: 'Nutrition', icon: Utensils, highlight: 'text-kaizen-calories' },
    { id: 'water' as const, label: 'Hydration', icon: Droplets, highlight: 'text-kaizen-water' },
    { id: 'sleep' as const, label: 'Sleep Cycle', icon: Moon, highlight: 'text-indigo-400' },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, highlight: 'text-emerald-400' },
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
                <div key={item.id}>
                  <button
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

                  {/* Sub-items under Workouts */}
                  {item.id === 'workouts' && activeTab === 'workouts' && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-kaizen-workout/40 ml-4 my-1">
                      <button
                        onClick={() => setWorkoutSubTab('tracker')}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-xs font-mono transition-colors ${
                          workoutSubTab === 'tracker'
                            ? 'bg-kaizen-workout/15 text-kaizen-workout font-bold'
                            : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/50'
                        }`}
                      >
                        <Dumbbell className="w-3 h-3" />
                        <span>Active Session</span>
                      </button>
                      <button
                        onClick={() => setWorkoutSubTab('planner')}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-xs font-mono transition-colors ${
                          workoutSubTab === 'planner'
                            ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                            : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/50'
                        }`}
                      >
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span>Workout Planner</span>
                      </button>
                      <button
                        onClick={() => setWorkoutSubTab('inventory')}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-xs font-mono transition-colors ${
                          workoutSubTab === 'inventory'
                            ? 'bg-amber-400/15 text-amber-300 font-bold'
                            : 'text-kaizen-muted hover:text-kaizen-text hover:bg-kaizen-surface-hover/50'
                        }`}
                      >
                        <Package className="w-3 h-3 text-amber-400" />
                        <span>Equipment Inventory</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div>
          {/* User & Actions */}
          <div className="mb-4 px-3 space-y-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-kaizen-text truncate">{user?.name || 'User'}</span>
              <button onClick={logout} className="text-kaizen-muted hover:text-kaizen-text transition-colors" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <Link
              to="/settings/profile"
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-kaizen-muted hover:text-kaizen-text rounded-control hover:bg-kaizen-surface-hover transition-colors"
            >
              <Settings className="w-3.5 h-3.5" /> Profile Settings
            </Link>
          </div>
          {/* Date Selector in Sidebar */}
          <div className="pt-4 border-t border-kaizen-border/60">
            <label className="text-[11px] font-mono text-kaizen-subtle uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-kaizen-muted" /> Active Date
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
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'workouts') setWorkoutSubTab('tracker');
            }}
          />
        )}
        {activeTab === 'workouts' && (
          <div className="space-y-6">
            {/* Workouts Top Sub-Navigation Bar */}
            <div className="flex border-b border-kaizen-border gap-6">
              <button
                onClick={() => setWorkoutSubTab('tracker')}
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 relative ${
                  workoutSubTab === 'tracker'
                    ? 'text-kaizen-workout border-b-2 border-kaizen-workout font-bold'
                    : 'text-kaizen-muted hover:text-kaizen-text'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
                Active Session
              </button>
              <button
                onClick={() => setWorkoutSubTab('planner')}
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 relative ${
                  workoutSubTab === 'planner'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold'
                    : 'text-kaizen-muted hover:text-kaizen-text'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Workout Planner
              </button>
              <button
                onClick={() => setWorkoutSubTab('inventory')}
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 relative ${
                  workoutSubTab === 'inventory'
                    ? 'text-amber-400 border-b-2 border-amber-400 font-bold'
                    : 'text-kaizen-muted hover:text-kaizen-text'
                }`}
              >
                <Package className="w-4 h-4" />
                Equipment & Inventory
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
