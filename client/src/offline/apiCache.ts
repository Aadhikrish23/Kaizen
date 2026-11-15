import { CACHE_OWNER_KEY, cacheOwnerAction } from './queueCore';

export const API_CACHE_NAME = 'kaizen-api';

const readOwner = (): string | null => {
  try { return localStorage.getItem(CACHE_OWNER_KEY); } catch { return null; }
};
const writeOwner = (id: string | null) => {
  try {
    if (id) localStorage.setItem(CACHE_OWNER_KEY, id);
    else localStorage.removeItem(CACHE_OWNER_KEY);
  } catch { /* storage unavailable */ }
};

/** Drop cached API responses and forget their owner. Call on every sign-out, forced or not. Never throws. */
export const clearApiCache = async (): Promise<void> => {
  writeOwner(null);
  try {
    if (typeof caches !== 'undefined') await caches.delete(API_CACHE_NAME);
  } catch {
    /* cache storage unavailable: nothing to clear */
  }
};

/**
 * Make the cache belong to `userId`: it is cleared when it was last used by a different user (or by nobody known),
 * then the owner is recorded. Call on login, register and session restore.
 */
export const claimApiCache = async (userId: string | null | undefined): Promise<void> => {
  if (cacheOwnerAction(readOwner(), userId) === 'clear') await clearApiCache();
  if (userId) writeOwner(userId);
};
