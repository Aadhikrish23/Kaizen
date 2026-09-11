import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { SuccessResponse } from '../types/api';
import * as aiMicroservice from '../services/aiMicroservice.service';

// Phase 13-16: Mock AI Controller
export const parseFoodText = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body;
  // Mock AI parsing
  const data = {
    name: text.split(' ')[0] || 'Unknown Food',
    calories: 250,
    protein: 15,
    carbs: 30,
    fat: 8
  };
  res.json({ success: true, data });
});

export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const date = (req.query.date as string) || undefined;
  const data = await aiMicroservice.getDailyInsight(user, date);
  res.json({ success: true, data });
});

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [
    { name: 'Grilled Chicken Salad', calories: 350, protein: 40 },
    { name: 'Greek Yogurt & Berries', calories: 200, protein: 20 }
  ] });
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
