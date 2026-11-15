import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v) && /^[a-f0-9]{24}$/i.test(v), 'Invalid id');

const paging = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
};

export const listUsersSchema = z.object({ query: z.object(paging) });
export const listFoodsSchema = z.object({ query: z.object(paging) });

// Only these two fields can ever be changed on a user by an admin; everything else is rejected.
export const updateUserSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      role: z.enum(['user', 'admin']).optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((b) => b.role !== undefined || b.isActive !== undefined, 'Provide role and/or isActive'),
});

const foodFields = {
  name: z.string().trim().min(2).max(100),
  brand: z.string().trim().max(100).optional(),
  servingSize: z.string().trim().min(1).max(50),
  calories: z.number().finite().min(0).max(10000),
  protein: z.number().finite().min(0).max(1000).default(0),
  carbs: z.number().finite().min(0).max(1000).default(0),
  fat: z.number().finite().min(0).max(1000).default(0),
  basis: z.enum(['per_100g', 'per_serving']).optional(),
  servingQty: z.number().finite().gt(0).max(10000).optional(),
  servingUnit: z.enum(['g', 'ml']).optional(),
};

export const createFoodSchema = z.object({ body: z.object(foodFields).strict() });

export const updateFoodSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: foodFields.name.optional(),
      brand: foodFields.brand,
      servingSize: foodFields.servingSize.optional(),
      calories: foodFields.calories.optional(),
      protein: z.number().finite().min(0).max(1000).optional(),
      carbs: z.number().finite().min(0).max(1000).optional(),
      fat: z.number().finite().min(0).max(1000).optional(),
      basis: foodFields.basis,
      servingQty: foodFields.servingQty,
      servingUnit: foodFields.servingUnit,
    })
    .strict()
    .refine((b) => Object.keys(b).length > 0, 'Provide at least one field'),
});

export const foodIdSchema = z.object({ params: z.object({ id: objectId }) });

export const FOOD_WRITE_KEYS = Object.keys(foodFields);
export const USER_PATCH_KEYS = ['role', 'isActive'];
