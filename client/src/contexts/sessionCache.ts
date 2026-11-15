// Pure helper (no imports) so server/test can exercise it: decides whether the in-memory React Query cache must be
// dropped when the signed-in user changes. The cache is keyed by query key only, not by user, so a different user
// (or a sign-out) must never see the previous user's data.
export const normalizeUserId = (id: unknown): string | null => (typeof id === 'string' && id.trim() ? id : null);

/** True when the signed-in user is not the one the cache was filled for (including sign-in after sign-out and sign-out). */
export const shouldClearQueryCache = (previousUserId: unknown, nextUserId: unknown): boolean =>
  normalizeUserId(previousUserId) !== normalizeUserId(nextUserId);

/** Window event raised by the API client when the session can no longer be renewed (refresh failed). */
export const SESSION_EXPIRED_EVENT = 'kaizen:session-expired';
