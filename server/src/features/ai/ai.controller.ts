import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { SuccessResponse } from '../../types/api';
import * as aiMicroservice from './aiMicroservice.service';
import { parseFoodFromText } from './parseFood.service';
import { getMealRecommendations } from './recommendations';

export const parseFoodText = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id.toString();
  const data = await parseFoodFromText(userId, req.body.text);
  res.json({ success: true, data });
});

export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const date = (req.query.date as string) || undefined;
  const data = await aiMicroservice.getDailyInsight(user, date);
  res.json({ success: true, data });
});

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const data = await getMealRecommendations(user, { date: req.query.date as string | undefined, limit });
  res.json({ success: true, data });
});

export const chatWithCoach = asyncHandler(async (req: Request, res: Response) => {
  const { message, history, date } = req.body;
  const user = (req as any).user;
  const data = await aiMicroservice.chatWithCoach(user, message, history, date);
  res.json({ success: true, data });
});

// Phase 20: Search
export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string;
  res.json({ success: true, data: { foods: [], recipes: [], workouts: [], query: q } });
});
