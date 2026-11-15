/**
 * Max requests per window for the global /api limiter. Defaults: 100 in production, 5000 otherwise. Override with
 * API_RATE_LIMIT_MAX (positive integer); invalid values fall back to the default. Only test environments such as the
 * post-merge smoke job should raise it; it is deliberately not set in compose or .env.example.
 */
export const apiRateLimitMax = (env: NodeJS.ProcessEnv = process.env): number => {
  const fallback = env.NODE_ENV === 'production' ? 100 : 5000;
  const raw = env.API_RATE_LIMIT_MAX;
  if (raw === undefined || !/^\d+$/.test(raw.trim())) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
};
