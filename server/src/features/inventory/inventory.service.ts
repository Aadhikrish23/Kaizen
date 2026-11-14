import mongoose from 'mongoose';
import UserInventory, { IUserInventory, IEquipmentItem } from './UserInventory';

/**
 * A new user starts with an empty, unconfirmed inventory: we do not assume any equipment.
 * Legacy inventories (created before the `confirmed` flag existed) have no value and count as confirmed.
 */
export const inventoryNeedsSetup = (inv: { confirmed?: boolean | null } | null | undefined): boolean =>
  !!inv && inv.confirmed === false;

export const toInventoryResponse = (inv: IUserInventory) => ({
  ...inv.toObject(),
  needsSetup: inventoryNeedsSetup(inv),
});

export const getUserInventory = async (userId: string | mongoose.Types.ObjectId): Promise<IUserInventory> => {
  let inventory = await UserInventory.findOne({ userId });
  if (!inventory) {
    try {
      inventory = await UserInventory.create({
        userId,
        equipment: [],
        confirmed: false,
        workingWeights: []
      });
    } catch (err: any) {
      if (err.code === 11000) {
        inventory = await UserInventory.findOne({ userId });
      } else {
        throw err;
      }
    }
  }
  return inventory!;
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
      confirmed: true,
      workingWeights: []
    });
  } else {
    inventory.equipment = equipment;
    inventory.confirmed = true; // the user explicitly chose this equipment (possibly none = bodyweight only)
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
