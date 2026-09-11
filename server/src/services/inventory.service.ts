import mongoose from 'mongoose';
import UserInventory, { IUserInventory, IEquipmentItem } from '../models/UserInventory';

export const DEFAULT_EQUIPMENT: IEquipmentItem[] = [
  {
    id: 'dumbbells-starter',
    type: 'dumbbell',
    name: 'Adjustable Dumbbells Set',
    availableWeightsKg: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20],
    notes: 'Standard starter dumbbell pair with spinlocks'
  },
  {
    id: 'flat-bench',
    type: 'bench',
    name: 'Adjustable Incline/Flat Bench',
    availableWeightsKg: [],
    notes: '0 to 90 degree positions'
  },
  {
    id: 'pullup-bar',
    type: 'pullup_bar',
    name: 'Doorway Pull-up & Dip Station',
    availableWeightsKg: [],
    notes: 'Home doorway mount'
  },
  {
    id: 'resistance-bands',
    type: 'bands',
    name: 'Loop & Tube Resistance Bands',
    availableWeightsKg: [5, 10, 15, 20, 25],
    notes: 'Light, medium, heavy tension bands'
  }
];

export const getUserInventory = async (userId: string | mongoose.Types.ObjectId): Promise<IUserInventory> => {
  let inventory = await UserInventory.findOne({ userId });
  if (!inventory) {
    inventory = await UserInventory.create({
      userId,
      equipment: DEFAULT_EQUIPMENT,
      workingWeights: []
    });
  }
  return inventory;
};

export const updateUserInventory = async (
  userId: string | mongoose.Types.ObjectId,
  equipment: IEquipmentItem[]
): Promise<IUserInventory> => {
  let inventory = await UserInventory.findOne({ userId });
  if (!inventory) {
    inventory = new UserInventory({
      userId,
      equipment,
      workingWeights: []
    });
  } else {
    inventory.equipment = equipment;
  }
  return await inventory.save();
};

export const recordWorkingWeight = async (
  userId: string | mongoose.Types.ObjectId,
  data: {
    exerciseName: string;
    exerciseId?: string;
    currentWeightKg: number;
    targetReps?: number;
    date?: string;
    rpe?: number;
  }
): Promise<IUserInventory> => {
  const inventory = await getUserInventory(userId);
  const logDate = data.date || new Date().toISOString().split('T')[0];
  const targetReps = data.targetReps || 10;

  const existingIdx = inventory.workingWeights.findIndex(
    ww => ww.exerciseName.trim().toLowerCase() === data.exerciseName.trim().toLowerCase()
  );

  const historyEntry = {
    date: logDate,
    weightKg: data.currentWeightKg,
    reps: targetReps,
    rpe: data.rpe
  };

  if (existingIdx >= 0) {
    const existing = inventory.workingWeights[existingIdx];
    existing.currentWeightKg = data.currentWeightKg;
    existing.targetReps = targetReps;
    existing.lastUsedDate = logDate;
    if (data.exerciseId) existing.exerciseId = data.exerciseId;
    if (!existing.history) existing.history = [];
    existing.history.push(historyEntry);
    if (existing.history.length > 50) {
      existing.history = existing.history.slice(-50);
    }
  } else {
    inventory.workingWeights.push({
      exerciseName: data.exerciseName,
      exerciseId: data.exerciseId,
      currentWeightKg: data.currentWeightKg,
      targetReps,
      lastUsedDate: logDate,
      history: [historyEntry]
    });
  }

  return await inventory.save();
};
