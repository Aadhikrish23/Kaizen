import { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ErrorResponse } from '../types/api';

export interface AiLimiterConfig {
  windowMs: number;
  max: number;
}

const intFromEnv = (name: string, fallback: number): number => {
  const n = Number.parseInt(process.env[name] || '', 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// LLM-backed endpoints are expensive; the deterministic ones (search, recommendations) get a looser cap.
export const aiLimits = (): { llm: AiLimiterConfig; light: AiLimiterConfig } => ({
  llm: { windowMs: 60 * 1000, max: intFromEnv('AI_RATE_LIMIT_PER_MIN', 30) },
  light: { windowMs: 60 * 1000, max: intFromEnv('AI_LIGHT_RATE_LIMIT_PER_MIN', 60) },
});

/** Per-user key (the authenticated user id); falls back to the client IP only if no user is attached. */
export const userKey = (req: Request): string => {
  const id = (req as any).user?._id ?? (req as any).user?.id;
  return id ? `user:${String(id)}` : `ip:${ipKeyGenerator(req.ip || '')}`;
};

export const rateLimitedResponse = (): ErrorResponse => ({
  success: false,
  error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down and try again shortly.' },
});

export const createAiLimiter = (cfg: AiLimiterConfig) =>
  rateLimit({
    windowMs: cfg.windowMs,
    limit: cfg.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userKey,
    handler: (_req: Request, res: Response) => {
      res.status(429).json(rateLimitedResponse());
    },
  });

const limits = aiLimits();
/** For expensive LLM-backed routes: chat, parse-food, insights, weekly insight. */
export const aiLlmLimiter = createAiLimiter(limits.llm);
/** For deterministic routes: search, recommendations. */
export const aiLightLimiter = createAiLimiter(limits.light);
