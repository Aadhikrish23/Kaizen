import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Play,
  CheckCircle2,
  Sparkles,
  Clock,
  Dumbbell,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  Flame,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAddWorkoutLog } from '../../services/workoutService';
import { useInventory } from '../../services/inventoryService';
import { useExercises } from '../../services/exerciseService';
import { ExerciseVideoModal } from './ExerciseVideoModal';
import { Exercise, WorkoutExercise } from '../../types';

interface BeginnerWorkoutPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateTomorrow?: (tomorrowDate: string) => void;
}

interface PlannedMovement {
  name: string;
  muscle: 'chest' | 'back' | 'legs' | 'shoulders' | 'biceps' | 'triceps' | 'core';
  equipment: 'dumbbell' | 'barbell' | 'bodyweight' | 'cable' | 'machine' | 'other';
  sets: number;
  reps: number;
  suggestedWeightKg: number;
  notes: string;
}

interface RoutineDay {
  dayNumber: number;
  dayOffset: number; // 1 = tomorrow, 2 = day after tomorrow, etc.
  type: 'workout' | 'rest';
  title: string;
  focus: string;
  movements: PlannedMovement[];
}

interface RoutinePlan {
  id: string;
  name: string;
  tagline: string;
  level: string;
  equipmentFocus: string;
  description: string;
  days: RoutineDay[];
}

export const BeginnerWorkoutPlanner: React.FC<BeginnerWorkoutPlannerProps> = ({
  isOpen,
  onClose,
  onActivateTomorrow,
}) => {
  const { data: inventory } = useInventory();
  const { data: exercisesCatalog } = useExercises();
  const { mutateAsync: addWorkoutLog, isPending: isActivating } = useAddWorkoutLog();

  const [selectedPlanId, setSelectedPlanId] = useState<'foundation-3day' | 'dumbbell-home'>(
    'foundation-3day'
  );
  const [showGym101, setShowGym101] = useState(true);
  const [selectedVideoExercise, setSelectedVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  // Helper to determine suggested starting weight from user inventory
  const getStartingWeight = (movementName: string, equipment: string, defaultKg: number): number => {
    const workingWeight = inventory?.workingWeights?.find(
      (ww) => ww.exerciseName.toLowerCase() === movementName.toLowerCase()
    );
    if (workingWeight && workingWeight.currentWeightKg > 0) {
      return workingWeight.currentWeightKg;
    }

    if (equipment === 'dumbbell' && inventory?.equipment) {
      const dbEquip = inventory.equipment.find((e) => e.type === 'dumbbell');
      if (dbEquip?.availableWeightsKg?.length) {
        const sorted = [...dbEquip.availableWeightsKg].sort((a, b) => a - b);
        const match = sorted.find((w) => w >= defaultKg) || sorted[0];
        return match;
      }
    }

    return defaultKg;
  };

  const formatDate = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      iso: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };

  const PLANS: RoutinePlan[] = useMemo(
    () => [
      {
        id: 'foundation-3day',
        name: '3-Day Full Body Foundation',
        tagline: 'The Gold Standard for Absolute Beginners',
        level: 'Beginner Friendly',
        equipmentFocus: 'Gym or Home Dumbbells + Bench',
        description:
          'Science-proven full-body stimulus 3 days a week with rest days in between. Maximizes neuromuscular adaptation without overwhelming muscle soreness.',
        days: [
          {
            dayNumber: 1,
            dayOffset: 1,
            type: 'workout',
            title: 'Foundation A: Push & Squat Anchor',
            focus: 'Chest, Quads, Back & Core',
            movements: [
              {
                name: 'Incline Dumbbell Press',
                muscle: 'chest',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Incline Dumbbell Press', 'dumbbell', 7.5),
                notes: 'Retract shoulder blades, keep wrists straight. Press in smooth controlled arc.',
              },
              {
                name: 'Barbell Back Squat',
                muscle: 'legs',
                equipment: 'barbell',
                sets: 3,
                reps: 8,
                suggestedWeightKg: getStartingWeight('Barbell Back Squat', 'barbell', 20),
                notes: 'Descend to parallel, chest proud, brace abdomen like taking a punch.',
              },
              {
                name: 'Lat Pulldown (Wide Grip)',
                muscle: 'back',
                equipment: 'cable',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Lat Pulldown (Wide Grip)', 'cable', 25),
                notes: 'Drive elbows down into your back pockets, pausing for 1 second at chest.',
              },
              {
                name: 'Standard Forearm Plank',
                muscle: 'core',
                equipment: 'bodyweight',
                sets: 3,
                reps: 30,
                suggestedWeightKg: 0,
                notes: 'Squeeze glutes and brace abs tightly in a straight line from crown to heels.',
              },
            ],
          },
          {
            dayNumber: 2,
            dayOffset: 2,
            type: 'rest',
            title: 'Active Recovery & Hydration',
            focus: 'Rest, Light Walk & Muscle Protein Synthesis',
            movements: [],
          },
          {
            dayNumber: 3,
            dayOffset: 3,
            type: 'workout',
            title: 'Foundation B: Hinge, Press & Arms',
            focus: 'Hamstrings, Shoulders & Biceps',
            movements: [
              {
                name: 'Romanian Deadlift (RDL)',
                muscle: 'legs',
                equipment: 'barbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Romanian Deadlift (RDL)', 'barbell', 20),
                notes: 'Soft knees, push hips back to wall behind you until deep hamstring stretch.',
              },
              {
                name: 'Seated Dumbbell Shoulder Press',
                muscle: 'shoulders',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Seated Dumbbell Shoulder Press', 'dumbbell', 7.5),
                notes: 'Elbows slightly angled forward at 45 degrees, press straight overhead.',
              },
              {
                name: 'Dumbbell Hammer Curl',
                muscle: 'biceps',
                equipment: 'dumbbell',
                sets: 3,
                reps: 12,
                suggestedWeightKg: getStartingWeight('Dumbbell Hammer Curl', 'dumbbell', 5),
                notes: 'Keep thumbs pointing to ceiling throughout to build brachialis arm thickness.',
              },
              {
                name: 'Cable Tricep Rope Pushdown',
                muscle: 'triceps',
                equipment: 'cable',
                sets: 3,
                reps: 12,
                suggestedWeightKg: getStartingWeight('Cable Tricep Rope Pushdown', 'cable', 15),
                notes: 'Lock elbows by your ribs, flare rope apart at bottom lockout.',
              },
            ],
          },
          {
            dayNumber: 4,
            dayOffset: 4,
            type: 'rest',
            title: 'Growth & Sleep Recovery',
            focus: 'Nutrition, 8 Hours Sleep & Glycogen Replenishment',
            movements: [],
          },
          {
            dayNumber: 5,
            dayOffset: 5,
            type: 'workout',
            title: 'Foundation C: Posterior Chain & Core',
            focus: 'Back, Glutes, Chest & Posture',
            movements: [
              {
                name: 'One-Arm Dumbbell Row',
                muscle: 'back',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('One-Arm Dumbbell Row', 'dumbbell', 10),
                notes: 'Pull dumbbell towards your hip pocket with zero torso swinging.',
              },
              {
                name: 'Walking Dumbbell Lunges',
                muscle: 'legs',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Walking Dumbbell Lunges', 'dumbbell', 5),
                notes: 'Stride forward with upright posture, drop trailing knee gently toward floor.',
              },
              {
                name: 'Push-Ups (Standard / Deficit)',
                muscle: 'chest',
                equipment: 'bodyweight',
                sets: 3,
                reps: 10,
                suggestedWeightKg: 0,
                notes: 'Maintain rigid plank line, tuck elbows 45 degrees on descent.',
              },
              {
                name: 'Face Pulls (Rope Cable)',
                muscle: 'back',
                equipment: 'cable',
                sets: 3,
                reps: 15,
                suggestedWeightKg: getStartingWeight('Face Pulls (Rope Cable)', 'cable', 12.5),
                notes: 'Crucial for shoulder health: pull rope to nose bridge and rotate knuckles back.',
              },
            ],
          },
          {
            dayNumber: 6,
            dayOffset: 6,
            type: 'rest',
            title: 'Weekend Rest & Recharge',
            focus: 'Light stretching & rest',
            movements: [],
          },
          {
            dayNumber: 7,
            dayOffset: 7,
            type: 'rest',
            title: 'Weekly Review',
            focus: 'Prepare for Week 2 progressive overload',
            movements: [],
          },
        ],
      },
      {
        id: 'dumbbell-home',
        name: 'Home Dumbbell Starter (3-Day)',
        tagline: '100% Calibrated for Dumbbells & Adjustable Bench',
        level: 'Home Workout Friendly',
        equipmentFocus: 'Dumbbells + Bench Only',
        description:
          'No commercial machines or barbells required. Complete full-body development using strictly your home dumbbell inventory with optimal compound angles.',
        days: [
          {
            dayNumber: 1,
            dayOffset: 1,
            type: 'workout',
            title: 'Home Session A: Chest, Legs & Arms',
            focus: 'Incline DB Press, Split Squats, Biceps',
            movements: [
              {
                name: 'Incline Dumbbell Press',
                muscle: 'chest',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Incline Dumbbell Press', 'dumbbell', 7.5),
                notes: 'Set bench to 30-45 degrees, smooth control.',
              },
              {
                name: 'Bulgarian Split Squat',
                muscle: 'legs',
                equipment: 'dumbbell',
                sets: 3,
                reps: 8,
                suggestedWeightKg: getStartingWeight('Bulgarian Split Squat', 'dumbbell', 5),
                notes: 'Rear foot elevated on bench, drop straight into hips.',
              },
              {
                name: 'One-Arm Dumbbell Row',
                muscle: 'back',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('One-Arm Dumbbell Row', 'dumbbell', 10),
                notes: 'Knee on bench, pull dumbbell to hip.',
              },
              {
                name: 'Dumbbell Hammer Curl',
                muscle: 'biceps',
                equipment: 'dumbbell',
                sets: 3,
                reps: 12,
                suggestedWeightKg: getStartingWeight('Dumbbell Hammer Curl', 'dumbbell', 5),
                notes: 'Strict form with zero body swinging.',
              },
            ],
          },
          {
            dayNumber: 2,
            dayOffset: 2,
            type: 'rest',
            title: 'Rest & Recovery',
            focus: 'Hydration and active rest',
            movements: [],
          },
          {
            dayNumber: 3,
            dayOffset: 3,
            type: 'workout',
            title: 'Home Session B: Shoulders & Posterior',
            focus: 'DB Shoulder Press, DB RDLs, Triceps',
            movements: [
              {
                name: 'Seated Dumbbell Shoulder Press',
                muscle: 'shoulders',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Seated Dumbbell Shoulder Press', 'dumbbell', 7.5),
                notes: 'Full active range, stop just shy of bone lockout.',
              },
              {
                name: 'Romanian Deadlift (RDL)',
                muscle: 'legs',
                equipment: 'barbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Romanian Deadlift (RDL)', 'dumbbell', 10),
                notes: 'Hold dumbbells in front of thighs, hinge hips backward.',
              },
              {
                name: 'Overhead Dumbbell Tricep Extension',
                muscle: 'triceps',
                equipment: 'dumbbell',
                sets: 3,
                reps: 12,
                suggestedWeightKg: getStartingWeight('Overhead Dumbbell Tricep Extension', 'dumbbell', 7.5),
                notes: 'Both hands cup single dumbbell overhead, deep stretch.',
              },
              {
                name: 'Standard Forearm Plank',
                muscle: 'core',
                equipment: 'bodyweight',
                sets: 3,
                reps: 30,
                suggestedWeightKg: 0,
                notes: 'Brace abs like taking a punch.',
              },
            ],
          },
          {
            dayNumber: 4,
            dayOffset: 4,
            type: 'rest',
            title: 'Rest & Recovery',
            focus: 'Nutrition and sleep',
            movements: [],
          },
          {
            dayNumber: 5,
            type: 'workout',
            dayOffset: 5,
            title: 'Home Session C: Full Body Hypertrophy',
            focus: 'Push-ups, Lunges, Delts & Core',
            movements: [
              {
                name: 'Push-Ups (Standard / Deficit)',
                muscle: 'chest',
                equipment: 'bodyweight',
                sets: 3,
                reps: 12,
                suggestedWeightKg: 0,
                notes: 'Elevate hands on bench if needed for beginner progression.',
              },
              {
                name: 'Walking Dumbbell Lunges',
                muscle: 'legs',
                equipment: 'dumbbell',
                sets: 3,
                reps: 10,
                suggestedWeightKg: getStartingWeight('Walking Dumbbell Lunges', 'dumbbell', 5),
                notes: 'Controlled steps, keep core braced.',
              },
              {
                name: 'Dumbbell Lateral Raise',
                muscle: 'shoulders',
                equipment: 'dumbbell',
                sets: 3,
                reps: 15,
                suggestedWeightKg: getStartingWeight('Dumbbell Lateral Raise', 'dumbbell', 2.5),
                notes: 'Light weight! Lead with elbows in 30 degree forward angle.',
              },
              {
                name: 'Russian Twists',
                muscle: 'core',
                equipment: 'dumbbell',
                sets: 3,
                reps: 15,
                suggestedWeightKg: getStartingWeight('Russian Twists', 'dumbbell', 5),
                notes: 'Rotate through obliques, keeping spine upright.',
              },
            ],
          },
          {
            dayNumber: 6,
            dayOffset: 6,
            type: 'rest',
            title: 'Rest Day',
            focus: 'Walk & relax',
            movements: [],
          },
          {
            dayNumber: 7,
            dayOffset: 7,
            type: 'rest',
            title: 'Rest Day',
            focus: 'Prepare for next week',
            movements: [],
          },
        ],
      },
    ],
    [inventory]
  );

  const activePlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[0];
  const day1 = activePlan.days[0];
  const tomorrowDateStr = formatDate(1).iso;

  const handleWatchVideo = (movementName: string) => {
    const found = (exercisesCatalog as Exercise[] | undefined)?.find(
      (e) => e.name.toLowerCase() === movementName.toLowerCase()
    );

    if (found) {
      setSelectedVideoExercise(found);
    } else {
      setSelectedVideoExercise({
        _id: 'temp',
        name: movementName,
        targetMuscle: 'chest',
        equipment: 'dumbbell',
        instructions: 'Watch demo form video and execute with strict control.',
      });
    }
    setIsVideoModalOpen(true);
  };

  const handleActivateRoutine = async () => {
    if (!day1 || day1.movements.length === 0) return;

    try {
      const workoutExercises: WorkoutExercise[] = day1.movements.map((m) => ({
        exerciseName: m.name,
        targetMuscle: m.muscle,
        sets: Array.from({ length: m.sets }, (_, i) => ({
          setNumber: i + 1,
          weightKg: m.suggestedWeightKg,
          reps: m.reps,
          rpe: 8,
          completed: false,
        })),
      }));

      await addWorkoutLog({
        date: tomorrowDateStr,
        splitName: day1.title,
        muscleGroups: [day1.focus],
        exercises: workoutExercises,
        durationMinutes: 45,
        notes: `Activated from ${activePlan.name}. Day 1 begins tomorrow!`,
      });

      setActivationSuccess(true);
      if (onActivateTomorrow) {
        onActivateTomorrow(tomorrowDateStr);
      }
    } catch (err) {
      console.error('Failed to activate beginner routine:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#141721] border border-slate-800/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0C0E14]/40">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Newbie Workout Planner
                  </h2>
                  <Badge variant="emerald" className="text-xs">
                    Day 1 Starts Tomorrow
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Tailored to your equipment inventory with live form video references for every movement
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* Gym 101 Accordion */}
            <div className="rounded-xl border border-slate-800/80 bg-[#0C0E14]/60 overflow-hidden">
              <button
                onClick={() => setShowGym101(!showGym101)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-200">
                    Gym Basics 101: What You Need To Know Before Tomorrow
                  </span>
                </div>
                {showGym101 ? (
                  <ChevronUp size={18} className="text-slate-400" />
                ) : (
                  <ChevronDown size={18} className="text-slate-400" />
                )}
              </button>

              {showGym101 && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-[#141721] border border-slate-800 space-y-1">
                    <p className="font-semibold text-emerald-400">1. What is a Set vs Rep?</p>
                    <p className="text-slate-300 leading-relaxed">
                      A <strong>rep</strong> is performing an exercise once. A <strong>set</strong> is doing
                      a sequence of reps (e.g. 10 reps). Doing 3 sets of 10 means do 10, rest, repeat 3
                      times total.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#141721] border border-slate-800 space-y-1">
                    <p className="font-semibold text-emerald-400">2. How to Pick Starting Weights?</p>
                    <p className="text-slate-300 leading-relaxed">
                      Start conservative! We have pre-filled suggestions from your inventory. You should be
                      able to finish all reps with good form, feeling like you have 2 reps left in reserve.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#141721] border border-slate-800 space-y-1">
                    <p className="font-semibold text-emerald-400">3. Rest Intervals</p>
                    <p className="text-slate-300 leading-relaxed">
                      Take <strong>60 to 90 seconds of rest</strong> between sets. Sip water and let your
                      heart rate settle before the next set.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#141721] border border-slate-800 space-y-1">
                    <p className="font-semibold text-emerald-400">4. Progressive Overload</p>
                    <p className="text-slate-300 leading-relaxed">
                      When you can complete all 3 sets with ease and flawless form, bump the weight by 1 to
                      2.5 kg on your next workout. That simple consistency builds strength!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Routine Selector Tabs */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Select Your Beginner Program
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id as any)}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      selectedPlanId === plan.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-[#0C0E14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-200">{plan.name}</span>
                      <Badge
                        variant={selectedPlanId === plan.id ? 'emerald' : 'neutral'}
                        className="text-[10px]"
                      >
                        {plan.level}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{plan.description}</p>
                    <div className="mt-2 text-[11px] font-mono text-emerald-400/90 flex items-center gap-1">
                      <Dumbbell size={12} />
                      {plan.equipmentFocus}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule View: Starting Tomorrow */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-400" />
                    Upcoming Schedule (Starts Tomorrow)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Day 1 is scheduled for tomorrow: <span className="text-emerald-400 font-semibold">{formatDate(1).dayName}, {formatDate(1).formatted}</span>
                  </p>
                </div>
              </div>

              {/* Days List */}
              <div className="space-y-3">
                {activePlan.days.map((day) => {
                  const dateInfo = formatDate(day.dayOffset);
                  const isDay1 = day.dayOffset === 1;

                  if (day.type === 'rest') {
                    return (
                      <div
                        key={day.dayNumber}
                        className="p-3.5 rounded-xl bg-[#0C0E14]/50 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-500 w-16">
                            {dateInfo.dayName} {dateInfo.formatted}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                            Rest Day
                          </span>
                          <span className="text-slate-300 font-medium">{day.title}</span>
                        </div>
                        <span className="text-slate-500 italic hidden sm:inline">{day.focus}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={day.dayNumber}
                      className={`rounded-xl border p-4 transition-all ${
                        isDay1
                          ? 'bg-[#0C0E14] border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                          : 'bg-[#0C0E14] border-slate-800/80'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                            {dateInfo.dayName} {dateInfo.formatted}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              {day.title}
                              {isDay1 && (
                                <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-bold uppercase">
                                  Tomorrow
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-slate-400">{day.focus}</p>
                          </div>
                        </div>
                        <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-500" />
                          40-45 mins
                        </div>
                      </div>

                      {/* Exercise Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {day.movements.map((movement, mIdx) => (
                          <div
                            key={mIdx}
                            className="p-3 rounded-lg bg-[#141721] border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-xs text-white">
                                  {movement.name}
                                </span>
                                <Badge variant="neutral" className="capitalize text-[10px]">
                                  {movement.muscle}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1">
                                {movement.notes}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                              <span className="font-mono text-emerald-400">
                                {movement.sets} sets &times; {movement.reps} reps
                                {movement.suggestedWeightKg > 0 && (
                                  <span className="text-slate-400 ml-1.5">
                                    (@ {movement.suggestedWeightKg} kg)
                                  </span>
                                )}
                              </span>

                              <button
                                onClick={() => handleWatchVideo(movement.name)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-2 py-0.5 rounded"
                              >
                                <Play size={10} className="fill-current" />
                                Watch Demo
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer with 1-Click Activate Button */}
          <div className="p-4 border-t border-slate-800 bg-[#0C0E14]/40 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {activationSuccess ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  Tomorrow's Day 1 workout is loaded into your Tracker!
                </span>
              ) : (
                <span>Clicking activate will populate tomorrow's tracker session.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleActivateRoutine}
                disabled={isActivating || activationSuccess}
                className="gap-2"
              >
                {activationSuccess ? (
                  <>
                    <Check size={16} />
                    Routine Activated
                  </>
                ) : (
                  <>
                    <Flame size={16} />
                    {isActivating ? 'Activating...' : `Start Tomorrow (${formatDate(1).dayName})`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal if clicked from movement cards */}
      <ExerciseVideoModal
        exercise={selectedVideoExercise}
        isOpen={isVideoModalOpen}
        onClose={() => {
          setIsVideoModalOpen(false);
          setSelectedVideoExercise(null);
        }}
      />
    </>
  );
};
