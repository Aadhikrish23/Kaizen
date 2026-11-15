import { createAiLimiter } from './aiRateLimit';

/** Per-admin limit (ADMIN_RATE_LIMIT_PER_15MIN, default 300), keyed by user id; applied after authentication and the admin check. */
export const adminRateLimitMax = (env: NodeJS.ProcessEnv = process.env): number => {
  const n = Number.parseInt(env.ADMIN_RATE_LIMIT_PER_15MIN || '', 10);
  return Number.isInteger(n) && n > 0 ? n : 300;
};
export const adminLimiter = createAiLimiter({ windowMs: 15 * 60 * 1000, max: adminRateLimitMax() });
