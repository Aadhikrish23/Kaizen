import { SessionBlueprint, ExerciseCatalogItem, SplitStyle } from './movementModel';

/**
 * Generate session blueprints for the requested split architecture
 */
export const getSessionBlueprintsForSplit = (splitStyle: SplitStyle): SessionBlueprint[] => {
  switch (splitStyle) {
    case 'home_dumbbell':
      return [
        {
          dayIndex: 0,
          title: 'Home Dumbbell - Upper Body Push & Pull',
          focus: 'Horizontal and vertical torso mechanics with core stabilization',
          intent: 'Upper Body Push & Pull',
          primaryMuscles: ['chest', 'back', 'core'],
          slots: [
            { name: 'Horizontal Push', pattern: 'horizontal_push', mechanic: 'compound' },
            { name: 'Horizontal Pull', pattern: 'horizontal_pull', mechanic: 'compound' },
            { name: 'Vertical Pattern', pattern: ['vertical_pull', 'vertical_push'], mechanic: 'compound' },
            { name: 'Upper Accessory', pattern: ['shoulder_abduction', 'elbow_flexion'], mechanic: 'isolation' },
            { name: 'Core Stabilization', pattern: ['anti_extension', 'anti_rotation'] },
          ],
        },
        {
          dayIndex: 1,
          title: 'Home Dumbbell - Lower Body Resilience & Core',
          focus: 'Bilateral knee loading, hip hinge mechanics, and core bracing',
          intent: 'Lower Body Resilience',
          primaryMuscles: ['legs', 'core'],
          slots: [
            { name: 'Bilateral Squat', pattern: 'squat', mechanic: 'compound', lateralityPreference: 'bilateral' },
            { name: 'Hip Hinge / Posterior Chain', pattern: 'hinge', mechanic: 'compound', lateralityPreference: 'bilateral' },
            { name: 'Unilateral Leg', pattern: 'lunge_single_leg', mechanic: 'compound', lateralityPreference: 'unilateral' },
            { name: 'Lower Accessory / Calves', pattern: ['calf', 'squat'], mechanic: 'isolation' },
            { name: 'Core Stabilization', pattern: ['anti_extension', 'controlled_rotation'] },
          ],
        },
        {
          dayIndex: 2,
          title: 'Home Dumbbell - Delts, Arms & Hypertrophy',
          focus: 'Vertical deltoid pressing, lateral raises, biceps, and triceps isolation',
          intent: 'Delts & Arms Hypertrophy',
          primaryMuscles: ['shoulders', 'biceps', 'triceps'],
          slots: [
            { name: 'Vertical Deltoid Press', pattern: 'vertical_push', mechanic: 'compound' },
            { name: 'Lateral Deltoids', pattern: 'shoulder_abduction', mechanic: 'isolation' },
            { name: 'Direct Biceps (Elbow Flexion)', pattern: 'elbow_flexion', mechanic: 'isolation', targetMuscles: ['biceps'] },
            { name: 'Direct Triceps (Elbow Extension)', pattern: 'elbow_extension', mechanic: 'isolation', targetMuscles: ['triceps'] },
            { name: 'Posterior Deltoids / Scapular', pattern: 'rear_delt', mechanic: 'isolation' },
          ],
        },
        {
          dayIndex: 4, // Friday (after Thursday rest)
          title: 'Home Dumbbell - Compound Conditioning & Core',
          focus: 'High-density multi-joint circuit, metabolic conditioning, and loaded carries',
          intent: 'Compound Conditioning',
          primaryMuscles: ['legs', 'chest', 'core'],
          isConditioningSession: true,
          slots: [
            { name: 'Full-Body Dynamic Compound', pattern: ['conditioning_circuit', 'squat'], isConditioning: true },
            { name: 'Push / Row Complex', pattern: ['conditioning_circuit', 'horizontal_push'], isConditioning: true },
            { name: 'Metabolic Plyometric / Cardio', pattern: ['conditioning_hiit', 'squat'], isConditioning: true },
            { name: 'Rotational / Core Stamina', pattern: ['controlled_rotation', 'anti_extension'] },
            { name: 'Loaded Carry Finisher', pattern: ['conditioning_carry', 'anti_extension'], isConditioning: true },
          ],
        },
        {
          dayIndex: 5, // Saturday
          title: 'Home Dumbbell - Posterior Chain & Back Specialization',
          focus: 'Vertical pulling, hamstring hinges, back density, and bicep volume',
          intent: 'Posterior Chain & Back',
          primaryMuscles: ['back', 'legs', 'biceps'],
          slots: [
            { name: 'Vertical Pull', pattern: 'vertical_pull', mechanic: 'compound' },
            { name: 'Posterior Chain Hip Hinge', pattern: 'hinge', mechanic: 'compound' },
            { name: 'Horizontal Row', pattern: 'horizontal_pull', mechanic: 'compound' },
            { name: 'Scapular & Rear Delts', pattern: 'rear_delt', mechanic: 'isolation' },
            { name: 'Arm Hypertrophy', pattern: 'elbow_flexion', mechanic: 'isolation' },
          ],
        },
      ];

    case 'full_body':
      return [
        {
          dayIndex: 0,
          title: 'Full Body - Compound Foundation',
          focus: 'Primary multi-joint push, pull, squat, and core stability',
          intent: 'Full Body Foundation',
          primaryMuscles: ['chest', 'back', 'legs', 'core'],
          slots: [
            { name: 'Knee Dominant', pattern: 'squat', mechanic: 'compound' },
            { name: 'Horizontal Push', pattern: 'horizontal_push', mechanic: 'compound' },
            { name: 'Horizontal Pull', pattern: 'horizontal_pull', mechanic: 'compound' },
            { name: 'Hip Dominant', pattern: 'hinge', mechanic: 'compound' },
            { name: 'Core Stabilization', pattern: 'anti_extension' },
          ],
        },
        {
          dayIndex: 2,
          title: 'Full Body - Posterior Chain & Pull Focus',
          focus: 'Back breadth, hamstring hinges, overhead pressing, and arms',
          intent: 'Full Body Posterior Focus',
          primaryMuscles: ['back', 'legs', 'shoulders', 'biceps'],
          slots: [
            { name: 'Hip Hinge', pattern: 'hinge', mechanic: 'compound' },
            { name: 'Vertical Pull', pattern: 'vertical_pull', mechanic: 'compound' },
            { name: 'Vertical Push', pattern: 'vertical_push', mechanic: 'compound' },
            { name: 'Unilateral Leg', pattern: 'lunge_single_leg', mechanic: 'compound' },
            { name: 'Elbow Flexion', pattern: 'elbow_flexion', mechanic: 'isolation' },
          ],
        },
        {
          dayIndex: 4,
          title: 'Full Body - Athletic Hypertrophy & Arms',
          focus: 'Squat density, chest pressing, back rowing, and direct arm work',
          intent: 'Full Body Athletic Hypertrophy',
          primaryMuscles: ['chest', 'legs', 'back', 'triceps'],
          slots: [
            { name: 'Bilateral Squat', pattern: 'squat', mechanic: 'compound' },
            { name: 'Horizontal Push', pattern: 'horizontal_push', mechanic: 'compound' },
            { name: 'Horizontal Pull', pattern: 'horizontal_pull', mechanic: 'compound' },
            { name: 'Lateral Delts', pattern: 'shoulder_abduction', mechanic: 'isolation' },
            { name: 'Elbow Extension', pattern: 'elbow_extension', mechanic: 'isolation' },
          ],
        },
      ];

    case 'upper_lower':
      return [
        {
          dayIndex: 0,
          title: 'Upper Body - Push & Pull Strength',
          focus: 'Horizontal push, horizontal row, vertical press, and vertical pull',
          intent: 'Upper Body Strength',
          primaryMuscles: ['chest', 'back', 'shoulders'],
          slots: [
            { name: 'Horizontal Push', pattern: 'horizontal_push', mechanic: 'compound' },
            { name: 'Horizontal Pull', pattern: 'horizontal_pull', mechanic: 'compound' },
            { name: 'Vertical Push', pattern: 'vertical_push', mechanic: 'compound' },
            { name: 'Vertical Pull', pattern: 'vertical_pull', mechanic: 'compound' },
            { name: 'Arm Accessory', pattern: ['elbow_flexion', 'elbow_extension'] },
          ],
        },
        {
          dayIndex: 1,
          title: 'Lower Body - Squat, Hinge & Core',
          focus: 'Bilateral quad work, hamstring hinges, and midsection stabilization',
          intent: 'Lower Body Strength',
          primaryMuscles: ['legs', 'core'],
          slots: [
            { name: 'Bilateral Squat', pattern: 'squat', mechanic: 'compound' },
            { name: 'Hip Hinge', pattern: 'hinge', mechanic: 'compound' },
            { name: 'Unilateral Leg', pattern: 'lunge_single_leg', mechanic: 'compound' },
            { name: 'Calves', pattern: 'calf', mechanic: 'isolation' },
            { name: 'Core Stabilization', pattern: 'anti_extension' },
          ],
        },
        {
          dayIndex: 3,
          title: 'Upper Body - Hypertrophy & Arms',
          focus: 'Pec development, upper back density, lateral delts, and arm volume',
          intent: 'Upper Body Hypertrophy',
          primaryMuscles: ['chest', 'back', 'biceps', 'triceps'],
          slots: [
            { name: 'Chest Press', pattern: 'horizontal_push', mechanic: 'compound' },
            { name: 'Back Row', pattern: 'horizontal_pull', mechanic: 'compound' },
            { name: 'Lateral Delts', pattern: 'shoulder_abduction', mechanic: 'isolation' },
            { name: 'Biceps Flexion', pattern: 'elbow_flexion', mechanic: 'isolation' },
            { name: 'Triceps Extension', pattern: 'elbow_extension', mechanic: 'isolation' },
          ],
        },
        {
          dayIndex: 4,
          title: 'Lower Body - Posterior Chain & Core Stamina',
          focus: 'Hamstring RDLs, quad lunges, and rotational core stamina',
          intent: 'Lower Body Posterior',
          primaryMuscles: ['legs', 'core'],
          slots: [
            { name: 'Hip Hinge', pattern: 'hinge', mechanic: 'compound' },
            { name: 'Unilateral Quad', pattern: 'lunge_single_leg', mechanic: 'compound' },
            { name: 'Squat Accessory', pattern: 'squat', mechanic: 'compound' },
            { name: 'Calves', pattern: 'calf', mechanic: 'isolation' },
            { name: 'Rotational Core', pattern: ['controlled_rotation', 'anti_rotation'] },
          ],
        },
      ];

    case 'ppl':
    default:
      return [
        {
          dayIndex: 0,
          title: 'Push - Chest, Shoulders & Triceps',
          focus: 'Horizontal pressing, vertical pressing, lateral delts, and tricep lockout',
          intent: 'Push',
          primaryMuscles: ['chest', 'shoulders', 'triceps'],
          slots: [
            { name: 'Horizontal Push', pattern: 'horizontal_push', mechanic: 'compound' },
            { name: 'Vertical Push', pattern: 'vertical_push', mechanic: 'compound' },
            { name: 'Lateral Deltoids', pattern: 'shoulder_abduction', mechanic: 'isolation' },
            { name: 'Triceps Extension', pattern: 'elbow_extension', mechanic: 'isolation' },
            { name: 'Core Stabilization', pattern: 'anti_extension' },
          ],
        },
        {
          dayIndex: 1,
          title: 'Pull - Lat Width & Bicep Specialization',
          focus: 'Vertical pulling, horizontal rowing, rear delts, and bicep volume',
          intent: 'Pull',
          primaryMuscles: ['back', 'biceps'],
          slots: [
            { name: 'Vertical Pull', pattern: 'vertical_pull', mechanic: 'compound' },
            { name: 'Horizontal Pull', pattern: 'horizontal_pull', mechanic: 'compound' },
            { name: 'Scapular / Rear Delts', pattern: 'rear_delt', mechanic: 'isolation' },
            { name: 'Direct Biceps', pattern: 'elbow_flexion', mechanic: 'isolation' },
            { name: 'Lat Accessory', pattern: 'vertical_pull', mechanic: 'compound' },
          ],
        },
        {
          dayIndex: 2,
          title: 'Legs - Squat, Hinge & Calves',
          focus: 'Bilateral knee loading, hamstring hinges, lunges, and calf work',
          intent: 'Legs',
          primaryMuscles: ['legs', 'core'],
          slots: [
            { name: 'Bilateral Squat', pattern: 'squat', mechanic: 'compound' },
            { name: 'Hip Hinge', pattern: 'hinge', mechanic: 'compound' },
            { name: 'Unilateral Leg', pattern: 'lunge_single_leg', mechanic: 'compound' },
            { name: 'Calves', pattern: 'calf', mechanic: 'isolation' },
            { name: 'Core Anti-Extension', pattern: 'anti_extension' },
          ],
        },
      ];
  }
};

/**
 * Validate that chosen exercises actually fulfill the declared session intent
 */
export const validateSessionIntentFulfillment = (
  blueprint: SessionBlueprint,
  selectedExercises: ExerciseCatalogItem[]
): { isValid: boolean; missingIntent: string[] } => {
  const missingIntent: string[] = [];

  // Delts & Arms check
  if (blueprint.intent.includes('Arms')) {
    const hasBiceps = selectedExercises.some(e => e.movementPattern === 'elbow_flexion' || e.targetMuscle === 'biceps');
    const hasTriceps = selectedExercises.some(e => e.movementPattern === 'elbow_extension' || e.targetMuscle === 'triceps');
    if (!hasBiceps) missingIntent.push('Session intent declared Arms, but no direct bicep/elbow flexion movement was included.');
    if (!hasTriceps) missingIntent.push('Session intent declared Arms, but no direct tricep/elbow extension movement was included.');
  }

  // Lower Body check
  if (blueprint.intent.includes('Lower') || blueprint.intent.includes('Legs')) {
    const hasSquat = selectedExercises.some(e => e.movementPattern === 'squat' || e.movementPattern === 'lunge_single_leg');
    const hasHinge = selectedExercises.some(e => e.movementPattern === 'hinge');
    if (!hasSquat) missingIntent.push('Session intent declared Lower Body, but no knee-dominant squat/lunge was included.');
    if (!hasHinge) missingIntent.push('Session intent declared Lower Body, but no hip-dominant hinge movement was included.');
  }

  // Posterior Chain check
  if (blueprint.intent.includes('Posterior Chain')) {
    const hasHingeOrPull = selectedExercises.some(e => e.movementPattern === 'hinge' || e.movementPattern === 'vertical_pull');
    if (!hasHingeOrPull) missingIntent.push('Session intent declared Posterior Chain, but no hip hinge or vertical pull was included.');
  }

  // Conditioning check
  if (blueprint.isConditioningSession) {
    const hasConditioning = selectedExercises.some(e => e.movementPattern.startsWith('conditioning_') || e.conditioningClass);
    if (!hasConditioning) missingIntent.push('Session intent declared Conditioning, but no conditioning movements were included.');
  }

  return {
    isValid: missingIntent.length === 0,
    missingIntent,
  };
};
