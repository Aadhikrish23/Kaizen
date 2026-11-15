import { createAiLimiter } from './aiRateLimit';

const WINDOW_MS = 15 * 60 * 1000;

const intFromEnv = (name: string, fallback: number): number => {
  const n = Number.parseInt(process.env[name] || '', 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const remindersLimits = () => ({
  // One open tab polls /reminders/due once a minute (15 per window); 120 per user covers several tabs and devices.
  user: { windowMs: WINDOW_MS, max: intFromEnv('REMINDERS_RATE_LIMIT_PER_USER', 120) },
  // Applied before authentication (no user yet, so the key is the client IP). Large because many users can share an IP.
  ip: { windowMs: WINDOW_MS, max: intFromEnv('REMINDERS_RATE_LIMIT_PER_IP', 3000) },
});

const limits = remindersLimits();
export const remindersIpLimiter = createAiLimiter(limits.ip);
export const remindersUserLimiter = createAiLimiter(limits.user);
