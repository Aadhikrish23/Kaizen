import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AI_TIMEOUTS_MS, chatWithAssistant, dailyInsight, forwardToAi } from './aiProxy.service';

// Thin proxies: the AI service does the work as the signed-in user (see aiProxy.service.ts).

export const parseFoodText = asyncHandler(async (req: Request, res: Response) => {
  const data = await forwardToAi({ method: 'POST', path: '/api/me/parse-food', req, body: { text: req.body.text }, timeoutMs: AI_TIMEOUTS_MS.parse });
  res.json({ success: true, data });
});

export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const data = await dailyInsight(req, (req.query.date as string) || undefined);
  res.json({ success: true, data });
});

export const getWeeklyInsight = asyncHandler(async (req: Request, res: Response) => {
  const data = await forwardToAi({ method: 'GET', path: '/api/me/insight/weekly', req, timeoutMs: AI_TIMEOUTS_MS.weekly });
  res.json({ success: true, data });
});

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const params: Record<string, unknown> = {};
  if (req.query.date) params.date = req.query.date;
  if (req.query.limit) params.limit = req.query.limit;
  const data = await forwardToAi({ method: 'GET', path: '/api/me/recommendations', req, params, timeoutMs: AI_TIMEOUTS_MS.recommendations });
  res.json({ success: true, data });
});

export const chatWithCoach = asyncHandler(async (req: Request, res: Response) => {
  const { message, history, date } = req.body;
  const data = await chatWithAssistant(req, message, history, date);
  res.json({ success: true, data });
});

export const resetAssistant = asyncHandler(async (req: Request, res: Response) => {
  const data = await forwardToAi({ method: 'POST', path: '/api/me/assistant/reset', req, timeoutMs: AI_TIMEOUTS_MS.reset });
  res.json({ success: true, data });
});
