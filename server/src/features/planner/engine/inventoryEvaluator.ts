import { ExerciseCatalogItem } from './movementModel';

export interface UserEquipmentProfile {
  hasBench: boolean;
  hasPullupBar: boolean;
  hasPushupBars: boolean;
  hasDipBars: boolean;
  hasDumbbells: boolean;
  availableDumbbellWeightsKg: number[];
  hasBarbell: boolean;
  availableBarbellWeightKg: number;
  hasBands: boolean;
  hasCable: boolean;
  hasMachine: boolean;
}

/**
 * Extract physical equipment profile from user inventory items
 */
export const buildEquipmentProfile = (equipmentList: any[] = []): UserEquipmentProfile => {
  const types = new Set((equipmentList || []).map(i => (i.type || '').toLowerCase()));
  const names = (equipmentList || []).map(i => (i.name || '').toLowerCase());
  const notes = (equipmentList || []).map(i => (i.notes || '').toLowerCase());
  const allText = names.join(' ') + ' ' + notes.join(' ');

  // Look for dumbbell items and extract weight options
  const dumbbellItems = (equipmentList || []).filter(
    i => (i.type || '').toLowerCase() === 'dumbbell' || (i.name || '').toLowerCase().includes('dumbbell')
  );
  let availableDumbbellWeightsKg: number[] = [];
  for (const item of dumbbellItems) {
    if (Array.isArray(item.availableWeightsKg) && item.availableWeightsKg.length > 0) {
      availableDumbbellWeightsKg.push(...item.availableWeightsKg);
    }
  }
  // Deduplicate and sort
  availableDumbbellWeightsKg = Array.from(new Set(availableDumbbellWeightsKg)).sort((a, b) => a - b);
  if (availableDumbbellWeightsKg.length === 0 && (types.has('dumbbell') || allText.includes('dumbbell'))) {
    // Default safe dumbbell set if unstated
    availableDumbbellWeightsKg = [4, 6, 8, 10, 12, 14, 16];
  }

  // Look for barbell item
  const barbellItem = (equipmentList || []).find(
    i => (i.type || '').toLowerCase() === 'barbell' || (i.name || '').toLowerCase().includes('barbell')
  );

  return {
    hasBench: types.has('bench') || allText.includes('bench'),
    hasPullupBar: types.has('pullup_bar') || allText.includes('pull-up') || allText.includes('pullup') || allText.includes('chin-up'),
    hasPushupBars: types.has('pushup_bar') || (types.has('other') && (allText.includes('pushup') || allText.includes('push up') || allText.includes('push-up'))),
    hasDipBars: types.has('dip_bars') || types.has('dip_station') || allText.includes('dip station') || allText.includes('dip bar'),
    hasDumbbells: types.has('dumbbell') || allText.includes('dumbbell'),
    availableDumbbellWeightsKg,
    hasBarbell: types.has('barbell') || allText.includes('barbell'),
    availableBarbellWeightKg: barbellItem?.barbellWeightKg || 20,
    hasBands: types.has('bands') || types.has('band') || allText.includes('band'),
    hasCable: types.has('cable') || allText.includes('cable'),
    hasMachine: types.has('machine') || allText.includes('machine'),
  };
};

/**
 * Strict evaluation of exercise suitability for the physical inventory profile
 */
export const isExerciseCompatibleWithProfile = (
  exercise: ExerciseCatalogItem,
  profile: UserEquipmentProfile
): boolean => {
  // 1. Bench requirement
  if (exercise.benchRequired && !profile.hasBench) {
    return false;
  }

  // 2. Pull-up bar requirement
  if (exercise.pullupBarRequired && !profile.hasPullupBar) {
    return false;
  }

  // 3. Equipment category requirement
  switch (exercise.equipment) {
    case 'dumbbell':
      if (!profile.hasDumbbells) return false;
      break;
    case 'barbell':
      if (!profile.hasBarbell) return false;
      break;
    case 'band':
      if (!profile.hasBands) return false;
      break;
    case 'cable':
      if (!profile.hasCable) return false;
      break;
    case 'machine':
      if (!profile.hasMachine) return false;
      break;
    case 'bodyweight':
      // Pull-up bar already handled above
      break;
    case 'other':
      // Check deficit push-ups vs pushup bars
      if (exercise.name.toLowerCase().includes('deficit push-up') && !profile.hasPushupBars) {
        return false;
      }
      break;
  }

  return true;
};
