import { UserEquipmentProfile } from './inventoryEvaluator';

/**
 * Capability-Based Bodyweight Progression Engine
 * Calibrates bodyweight movements (pull-ups, chin-ups, push-ups) according
 * to actual user capability tiers rather than blind static prescriptions.
 */

export interface CalibratedBodyweightPrescription {
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  repUnit: 'reps' | 'seconds';
  restSeconds: number;
  coachingNotes: string;
  formTips: string[];
}

/**
 * Calibrate pull-up/chin-up prescription based on user's demonstrated strict rep capacity AND equipment availability
 */
export const calibratePullupPrescription = (
  maxStrictReps: number = 0,
  profile?: UserEquipmentProfile,
  isBeginner: boolean = true
): CalibratedBodyweightPrescription => {
  const hasPullupBar = profile ? profile.hasPullupBar : true;
  const hasDumbbells = profile ? profile.hasDumbbells : false;

  // If user lacks a pull-up bar, provide an equipment-safe pulling movement
  if (!hasPullupBar) {
    if (hasDumbbells) {
      return {
        exerciseName: 'Split-Stance One-Arm Dumbbell Row',
        targetSets: 3,
        targetReps: 8,
        repUnit: 'reps',
        restSeconds: 75,
        coachingNotes: 'No Pull-Up Bar: Substituted vertical pull with bench-free Split-Stance Dumbbell Row to target lats, rhomboids, and biceps with available dumbbells.',
        formTips: [
          'Hinge forward with a flat back and staggered stance',
          'Drive working elbow toward your hip pocket',
          'Pause 1 second at peak lat contraction',
        ],
      };
    } else {
      // Zero pulling equipment (no bar, no dumbbells)
      return {
        exerciseName: 'Doorframe Isometric Row / Towel Pull',
        targetSets: 3,
        targetReps: 10,
        repUnit: 'reps',
        restSeconds: 45,
        coachingNotes: 'Zero Pulling Hardware: No pull-up bar or dumbbells detected. Programmed Doorframe Isometric Rows to activate lats, rhomboids, and rear delts safely without equipment.',
        formTips: [
          'Grip a sturdy doorframe at chest height with arms extended and body leaned back',
          'Pull chest to frame and squeeze shoulder blades hard for 2-3 seconds',
          'Maintain a rigid plank line through torso and hips',
        ],
      };
    }
  }

  // Tier 0: 0 strict pull-ups (WITH pull-up bar)
  if (maxStrictReps <= 0) {
    return {
      exerciseName: 'Negative Pull-Ups (Eccentric)',
      targetSets: 3,
      targetReps: 3,
      repUnit: 'reps',
      restSeconds: 90,
      coachingNotes: 'Pull-Up Guidance & Regression (Tier 0: 0 reps + Bar): Step or jump to top bar height, hold chin over bar for 1s, and lower with controlled 5-second eccentric descent to build strict pulling strength.',
      formTips: [
        'Use a sturdy step or jump to reach the top position safely',
        'Brace core and lower with controlled 5-second descent',
        'Step down, reset, and repeat without continuous dead hanging',
      ],
    };
  }

  // Tier 1: 1 - 2 strict pull-ups (WITH pull-up bar)
  if (maxStrictReps <= 2) {
    return {
      exerciseName: 'Negative Pull-Ups (Eccentric)',
      targetSets: 3,
      targetReps: 4,
      repUnit: 'reps',
      restSeconds: 90,
      coachingNotes: 'Pull-Up Guidance & Eccentric Overload (Tier 1: 1-2 reps): Use step/jump to reach the bar, hold chin over bar for 1s, then lower for 5 full seconds. Eccentric overload rapidly triggers neuromuscular lat adaptations.',
      formTips: [
        'Jump or step up so your chin clears the bar cleanly',
        'Lock scapulae down and tightly brace core',
        'Take a full 5 seconds to lower until arms are completely extended',
        'Step down, reset feet, and repeat without hanging continuously',
      ],
    };
  }

  // Tier 2: 3 - 5 strict pull-ups
  if (maxStrictReps <= 5) {
    return {
      exerciseName: 'Pull-Ups / Chin-Ups',
      targetSets: 3,
      targetReps: 4,
      repUnit: 'reps',
      restSeconds: 90,
      coachingNotes: 'Pull-Up Guidance & Sub-Maximal Clusters (Tier 2: 3-5 reps): Programmed 3-4 reps leaving 1-2 reps in reserve (RIR). Emphasize full extension at dead hang and chest-to-bar pull without kipping.',
      formTips: [
        'Start from a dead hang with elbows fully locked and active shoulders',
        'Drive elbows toward your back pockets, chest driving up',
        'Avoid kicking or swinging with lower body',
        'Control the descent; do not drop suddenly onto shoulder joints',
      ],
    };
  }

  // Tier 3: 6 - 9 strict pull-ups
  if (maxStrictReps <= 9) {
    return {
      exerciseName: 'Pull-Ups / Chin-Ups',
      targetSets: 3,
      targetReps: 7,
      repUnit: 'reps',
      restSeconds: 90,
      coachingNotes: 'Pull-Up Volume Accumulation (Tier 3: 6-9 reps): Working in the 6-8 rep hypertrophy zone with full range of motion. Ready to progress toward double-digit sets.',
      formTips: [
        'Active scapular depression before each repetition begins',
        'Maintain hollow-body abdominal tension throughout the set',
        'Clear chin completely over the bar on every repetition',
      ],
    };
  }

  // Tier 4: 10+ strict pull-ups
  return {
    exerciseName: 'Pull-Ups / Chin-Ups',
    targetSets: 4,
    targetReps: 10,
    repUnit: 'reps',
    restSeconds: 90,
    coachingNotes: 'Pull-Up Mastery (Tier 4: 10+ reps): High volume capacity. Target 10+ strict reps with pause at top, or transition to weighted pull-up progression with belt/dumbbell.',
    formTips: [
      'Dead hang to collarbone touch on each repetition',
      'Pause for 1 second at top contraction',
      'Add 2.5kg - 5kg external load if 12+ strict bodyweight reps can be completed with RPE <= 7',
    ],
  };
};

/**
 * Calibrate push-up prescription based on user's demonstrated strict rep capacity
 */
export const calibratePushupPrescription = (
  maxStrictReps: number = 5,
  hasPushupBars: boolean = false,
  isBeginner: boolean = true
): CalibratedBodyweightPrescription => {
  // Tier 0: 0 - 3 push-ups
  if (maxStrictReps <= 3) {
    return {
      exerciseName: 'Incline Push-Ups (Hands Elevated)',
      targetSets: 3,
      targetReps: 8,
      repUnit: 'reps',
      restSeconds: 60,
      coachingNotes: 'Push-Up Regression (Tier 0: 0-3 reps): Hands elevated on sturdy table, couch, or bench. Reduces loaded body mass from ~64% to ~45%, enabling strict horizontal push mechanics without lumbar sagging.',
      formTips: [
        'Place hands slightly wider than shoulder-width on an elevated surface',
        'Keep glutes squeezed and abs braced in a straight plank',
        'Lower chest to touch the surface edge with elbows tucked at 45 degrees',
        'Press firmly through palms to full lockout',
      ],
    };
  }

  // Tier 1: 4 - 8 push-ups
  if (maxStrictReps <= 8) {
    return {
      exerciseName: hasPushupBars ? 'Push-Up (with Handles / Push-up Bars)' : 'Push-Ups (Standard / Deficit)',
      targetSets: 3,
      targetReps: 6,
      repUnit: 'reps',
      restSeconds: 75,
      coachingNotes: 'Push-Up Standard Foundation (Tier 1: 4-8 reps): 3 sets of 5-7 reps focusing on strict chest-to-floor depth and neutral wrist alignment.',
      formTips: [
        'Hands positioned under shoulders with fingers spread or on pushup bars',
        'Scapulae protract at top of rep, retract smoothly on descent',
        'Lower until chest is 2cm from floor or handles pass chest line',
      ],
    };
  }

  // Tier 2: 9 - 15 push-ups
  if (maxStrictReps <= 15) {
    return {
      exerciseName: hasPushupBars ? 'Push-Up (with Handles / Push-up Bars)' : 'Push-Ups (Standard / Deficit)',
      targetSets: 3,
      targetReps: 12,
      repUnit: 'reps',
      restSeconds: 60,
      coachingNotes: 'Push-Up Hypertrophy Zone (Tier 2: 9-15 reps): Working in the 10-14 rep range. Focus on deep pectoral stretch at bottom and explosive concentric drive.',
      formTips: [
        'Control descent over 2-3 seconds',
        'Explode upward to complete lockout',
        'Ensure head and neck stay neutral; avoid forward head poking',
      ],
    };
  }

  // Tier 3: 16+ push-ups
  return {
    exerciseName: hasPushupBars ? 'Deficit Push-Ups' : 'Diamond Push-Ups',
    targetSets: 4,
    targetReps: 12,
    repUnit: 'reps',
    restSeconds: 60,
    coachingNotes: 'Advanced Push-Up Progression (Tier 3: 16+ reps): Standard push-ups exceed hypertrophy stimulus. Swapped to Deficit Push-Ups (extended ROM) or Diamond Push-Ups for enhanced triceps and chest recruitment.',
    formTips: [
      'Descend deep into deficit until chest dips below hands level',
      'Pause for 1 second in the stretched position under full tension',
      'Drive aggressively back to top lockout',
    ],
  };
};
