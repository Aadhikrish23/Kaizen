import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as admin from './admin.service';

const actor = (req: Request): string => (req as any).user._id.toString();

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await admin.getStats() });
});
export const users = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, q } = req.query as any;
  res.json({ success: true, data: await admin.listUsers(Number(page) || 1, Number(limit) || 25, q) });
});
export const patchUser = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await admin.updateUser(actor(req), req.params.id, req.body) });
});
export const foods = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, q } = req.query as any;
  res.json({ success: true, data: await admin.listFoods(Number(page) || 1, Number(limit) || 25, q) });
});
export const postFood = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: await admin.createFood(actor(req), req.body) });
});
export const patchFood = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await admin.updateFood(actor(req), req.params.id, req.body) });
});
export const removeFood = asyncHandler(async (req: Request, res: Response) => {
  await admin.deleteFood(actor(req), req.params.id);
  res.json({ success: true, data: null });
});
