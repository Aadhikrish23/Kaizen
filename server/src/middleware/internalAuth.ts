import crypto from 'crypto';
import { Request } from 'express';

export const INTERNAL_HEADER = 'x-kaizen-internal';

/**
 * True when the request carries the shared server-to-server secret (`AI_INTERNAL_TOKEN`, at least 16 characters; unset or short
 * means the feature is off). The AI service sends it on its calls back to this API so they do not drain the per-IP budget shared
 * by every user behind that one address. It only exempts the IP limiter: the caller still needs the user's own access token,
 * so it never widens what a request may do, and per-user limits still apply.
 */
export const isInternalRequest = (req: Pick<Request, 'headers'>, env: NodeJS.ProcessEnv = process.env): boolean => {
  const secret = (env.AI_INTERNAL_TOKEN || '').trim();
  if (secret.length < 16) return false;
  const given = req.headers[INTERNAL_HEADER];
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
