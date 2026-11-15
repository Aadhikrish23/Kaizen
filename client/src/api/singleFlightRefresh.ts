// Single-flight access-token refresh (pure, injectable: no imports so server/test can exercise it).
//
// Refresh tokens are single-use and consumed atomically on the server, so two refreshes with the same cookie cannot both
// succeed. When the access token expires and many requests get a 401 at once, they must share ONE refresh call; and several
// tabs must not refresh at the same time either (Web Locks when available).
export interface RefreshDeps {
  /** The currently stored access token (localStorage `kaizen_access_token`), or null. */
  getToken: () => string | null;
  setToken: (token: string) => void;
  /** Calls POST /auth/refresh; resolves with the new access token (or null/undefined if the response had none), rejects on failure. */
  doRefresh: () => Promise<string | null | undefined>;
  /** Forced logout side effects (remove token, clear caches, session-expired event). Called exactly once per failed refresh. */
  onFail: (error: unknown) => void;
  /** Give up on a refresh that takes longer than this (ms) and treat it as a failure, so a hung request cannot hold the cross-tab lock. */
  timeoutMs?: number;
  /** Cross-tab mutual exclusion (navigator.locks); when absent the refresh runs without a lock. */
  withLock?: <T>(fn: () => Promise<T>) => Promise<T>;
}

export class RefreshTimeoutError extends Error {
  constructor(ms: number) {
    super(`Token refresh timed out after ${ms} ms`);
    this.name = 'RefreshTimeoutError';
  }
}

/** Runs every cleanup step even if an earlier one throws (e.g. localStorage blocked); returns the errors that were swallowed. */
export const runAllSteps = (steps: Array<() => void>): unknown[] => {
  const errors: unknown[] = [];
  for (const step of steps) {
    try { step(); } catch (e) { errors.push(e); }
  }
  return errors;
};

/** Rejects with RefreshTimeoutError if `p` has not settled after `ms`; the timer is always cleared and a late result is ignored. */
const withTimeout = <T,>(p: Promise<T>, ms: number | undefined): Promise<T> => {
  if (!ms || ms <= 0) return p;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RefreshTimeoutError(ms)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
};

/** "Bearer abc" -> "abc" (null for anything else). */
export const bearerToken = (header: unknown): string | null => {
  if (typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

export const createTokenRefresher = (deps: RefreshDeps) => {
  let inFlight: Promise<string> | null = null;

  const run = async (usedToken: string | null): Promise<string> => {
    const body = async (): Promise<string> => {
      // Another tab may have refreshed while we waited for the lock: use its token instead of burning the refresh cookie
      const stored = deps.getToken();
      if (stored && stored !== usedToken) return stored;
      const next = await withTimeout(deps.doRefresh(), deps.timeoutMs);
      if (!next) throw new Error('Refresh response did not contain an access token');
      deps.setToken(next);
      return next;
    };
    return deps.withLock ? deps.withLock(body) : body();
  };

  /**
   * Resolves with an access token to retry with. `usedToken` is the token the failed request was sent with.
   * - If the stored token already differs (this or another tab refreshed meanwhile): resolve with it, no refresh.
   * - If a refresh is in flight: join it. Otherwise start one.
   * - If the refresh fails: every waiter rejects with the same error, `onFail` runs once, and the next request starts afresh.
   */
  return (usedToken: string | null): Promise<string> => {
    if (inFlight) return inFlight;
    const stored = deps.getToken();
    if (stored && stored !== usedToken) return Promise.resolve(stored);
    const flight: Promise<string> = run(usedToken).then(
      (token) => {
        inFlight = null;
        return token;
      },
      (error) => {
        inFlight = null;
        try { deps.onFail(error); } catch { /* never let the logout hook mask the refresh error */ }
        throw error;
      }
    );
    inFlight = flight;
    return flight;
  };
};
