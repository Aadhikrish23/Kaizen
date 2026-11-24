import axios from 'axios';
import { Request } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { INTERNAL_HEADER } from '../../middleware/internalAuth';
import { getSummaryByDate } from '../summary/summary.service';
import { todayInTz } from '../../utils/dates';

/**
 * Every AI feature (coach chat and the action assistant, daily and weekly insight, quick-add parsing, meal suggestions) is served
 * by the Python AI service. This API only authenticates the user, rate-limits, and forwards the request with the user's own access
 * token: the AI service reads and changes data back through this API as that user, so ownership and validation stay here.
 */
const aiServiceUrl = (): string => (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');

export const AI_TIMEOUTS_MS = { chat: 50000, insight: 20000, parse: 25000, weekly: 30000, recommendations: 15000, reset: 10000 } as const;

interface ForwardOptions {
  method: 'GET' | 'POST';
  path: string;
  req: Request;
  body?: unknown;
  params?: Record<string, unknown>;
  timeoutMs: number;
}

/** Turn the AI service's answer to a failed call into this API's own error shape. */
export const mapAiError = (err: unknown): AppError => {
  if (err instanceof AppError) return err;
  if (axios.isAxiosError(err) && err.response) {
    const { status, data } = err.response;
    const detail = (data as { detail?: unknown } | undefined)?.detail;
    const code = (detail as { code?: unknown } | undefined)?.code;
    const message = (detail as { message?: unknown } | undefined)?.message;
    if (status === 401 || status === 403) return new AppError(401, 'UNAUTHORIZED', 'Not authorized to access this route');
    if (status === 400 || status === 404 || status === 429) {
      return new AppError(status, typeof code === 'string' ? code : status === 429 ? 'RATE_LIMITED' : 'BAD_REQUEST', typeof message === 'string' ? message : 'The AI request was rejected');
    }
    if (status === 422) return new AppError(400, 'VALIDATION_ERROR', 'The AI request was not valid');
    if (status === 503) return new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable right now. Please try again shortly.');
    return new AppError(502, 'AI_UPSTREAM_ERROR', 'The AI service returned an error');
  }
  return new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable right now. Please try again shortly.');
};

export const forwardToAi = async <T>({ method, path, req, body, params, timeoutMs }: ForwardOptions): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  const internal = (process.env.AI_INTERNAL_TOKEN || '').trim();
  if (internal.length >= 16) headers[INTERNAL_HEADER] = internal;
  try {
    const res = await axios.request<T>({ url: `${aiServiceUrl()}${path}`, method, data: body, params, headers, timeout: timeoutMs });
    return res.data;
  } catch (err) {
    throw mapAiError(err);
  }
};

const isUnavailable = (err: unknown): boolean => err instanceof AppError && err.code === 'AI_UNAVAILABLE';

/** The numbers a canned answer can still honestly quote when the AI service is down. */
const remainingToday = async (user: any, date?: string) => {
  const summary = await getSummaryByDate(date || todayInTz(user.timezone), String(user._id || user.id));
  return {
    calories: Math.max(0, Math.round(summary.nutrition.calorieGoal - summary.nutrition.totalCalories)),
    protein: Math.max(0, Math.round(summary.nutrition.proteinGoal - summary.nutrition.totalProtein)),
  };
};

export const chatWithAssistant = async (req: Request, message: string, history: unknown, date?: string) => {
  try {
    return await forwardToAi<Record<string, unknown>>({ method: 'POST', path: '/api/me/assistant/chat', req, body: { message, history, date }, timeoutMs: AI_TIMEOUTS_MS.chat });
  } catch (err) {
    if (!isUnavailable(err)) throw err;
    console.warn('[AI proxy] AI service unreachable or timed out; using the canned coach reply.');
    const left = await remainingToday((req as any).user, date);
    return {
      reply: `The AI coach is offline right now, so I can't log or change anything. Today you have ${left.calories} kcal and ${left.protein}g protein left: focus on lean protein, steady hydration and quality rest.`,
      status: 'FAILED', source: 'fallback', modelUsed: 'heuristic-fallback', contextApplied: true, changed: [], actions: [], undoAvailable: false, confirmationRequired: false,
    };
  }
};

export const dailyInsight = async (req: Request, date?: string) => {
  try {
    return await forwardToAi<Record<string, unknown>>({ method: 'GET', path: '/api/me/insight/daily', req, params: date ? { date } : undefined, timeoutMs: AI_TIMEOUTS_MS.insight });
  } catch (err) {
    if (!isUnavailable(err)) throw err;
    const left = await remainingToday((req as any).user, date);
    return {
      insight: left.calories > 0
        ? `You have ${left.calories} kcal and ${left.protein}g protein left today -- stay consistent and fuel recovery.`
        : 'Calorie target reached! Prioritize hydration and 7-8 hours of sleep for optimal recovery.',
      category: 'daily',
      modelUsed: 'heuristic-fallback',
    };
  }
};
