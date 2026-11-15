import User from '../auth/User';
import FoodItem from '../foods/FoodItem';
import RefreshToken from '../auth/RefreshToken';
import MealLog from '../meals/MealLog';
import WaterLog from '../water/WaterLog';
import WeightLog from '../weight/WeightLog';
import SleepLog from '../sleep/SleepLog';
import WorkoutLog from '../workouts/WorkoutLog';
import AdminAuditLog from './AdminAuditLog';
import { AppError } from '../../middleware/errorHandler';
import { pickAllowed } from '../../utils/pickAllowed';
import {
  buildAuditEntry, buildStats, changedFields, foodSearchFilter, globalFoodFilter, userSearchFilter, selfModificationError, toPublicFood, toPublicUser, AdminUserPatch, AuditAction,
} from './admin.logic';
import { FOOD_WRITE_KEYS, USER_PATCH_KEYS } from './admin.schema';

const audit = (input: Parameters<typeof buildAuditEntry>[0]) => AdminAuditLog.create(buildAuditEntry(input));

export const getStats = async () => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const models: Record<string, any> = { meals: MealLog, water: WaterLog, weight: WeightLog, sleep: SleepLog, workouts: WorkoutLog };
  const names = Object.keys(models);

  const [totalUsers, ...rest] = await Promise.all([
    User.countDocuments({}),
    ...names.map((n) => models[n].countDocuments({})),
    ...names.map((n) => models[n].countDocuments({ createdAt: { $gte: since } })),
    ...names.map((n) => models[n].distinct('userId', { createdAt: { $gte: since } })),
  ]);
  const totals: Record<string, number> = {};
  const last7: Record<string, number> = {};
  const active: unknown[] = [];
  names.forEach((n, i) => {
    totals[n] = rest[i] as number;
    last7[n] = rest[names.length + i] as number;
    active.push(...(rest[2 * names.length + i] as unknown[]));
  });
  return buildStats({ totalUsers, activeUserIds: active, totals, last7 });
};

export const listUsers = async (page: number, limit: number, q?: string) => {
  const filter = userSearchFilter(q);
  const [rows, total] = await Promise.all([
    User.find(filter).select('email name role isActive onboardingComplete timezone createdAt updatedAt').sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { users: rows.map(toPublicUser), page, limit, total };
};

export const updateUser = async (actorId: string, targetId: string, patchInput: unknown) => {
  const patch = pickAllowed(patchInput, USER_PATCH_KEYS) as AdminUserPatch;
  const blocked = selfModificationError(actorId, targetId, patch);
  if (blocked) throw new AppError(400, 'SELF_MODIFICATION_FORBIDDEN', blocked);

  const before: any = await User.findById(targetId).select('email name role isActive').lean();
  if (!before) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const updated: any = await User.findByIdAndUpdate(targetId, { $set: patch }, { new: true, runValidators: true })
    .select('email name role isActive onboardingComplete timezone createdAt updatedAt').lean();

  // Deactivation also revokes every refresh token so no session can be renewed
  if (patch.isActive === false) await RefreshToken.deleteMany({ user: targetId });

  const diff = changedFields({ role: before.role, isActive: before.isActive !== false }, patch as Record<string, unknown>);
  await audit({ adminId: actorId, action: 'user.update', targetType: 'user', targetId, ...diff });
  return toPublicUser(updated);
};

export const listFoods = async (page: number, limit: number, q?: string) => {
  const filter = foodSearchFilter(q);
  const [rows, total] = await Promise.all([
    FoodItem.find(filter).sort({ name: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    FoodItem.countDocuments(filter),
  ]);
  return { foods: rows.map(toPublicFood), page, limit, total };
};

export const createFood = async (actorId: string, input: unknown) => {
  const data = pickAllowed(input, FOOD_WRITE_KEYS);
  // isCustom/userId/source are server-owned: admin foods are always global
  const food: any = await FoodItem.create({ ...data, isCustom: false, source: 'local' });
  await audit({ adminId: actorId, action: 'food.create', targetType: 'food', targetId: String(food._id), after: data });
  return toPublicFood(food);
};

export const updateFood = async (actorId: string, id: string, input: unknown) => {
  const data = pickAllowed(input, FOOD_WRITE_KEYS);
  const before: any = await FoodItem.findOne(globalFoodFilter({ _id: id })).lean();
  if (!before) throw new AppError(404, 'NOT_FOUND', 'Global food not found'); // custom foods are never reachable here
  const updated: any = await FoodItem.findOneAndUpdate(globalFoodFilter({ _id: id }), { $set: data }, { new: true, runValidators: true }).lean();
  const diff = changedFields(before, data);
  await audit({ adminId: actorId, action: 'food.update', targetType: 'food', targetId: id, ...diff });
  return toPublicFood(updated);
};

export const deleteFood = async (actorId: string, id: string) => {
  const before: any = await FoodItem.findOneAndDelete(globalFoodFilter({ _id: id })).lean();
  if (!before) throw new AppError(404, 'NOT_FOUND', 'Global food not found');
  await audit({ adminId: actorId, action: 'food.delete', targetType: 'food', targetId: id, before: toPublicFood(before) as any });
};

export type { AuditAction };
