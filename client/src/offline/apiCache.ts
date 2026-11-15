export const API_CACHE_NAME = 'kaizen-api';

/** Drop cached API responses (they belong to one user): called on login and logout. Never throws. */
export const clearApiCache = async (): Promise<void> => {
  try {
    if (typeof caches !== 'undefined') await caches.delete(API_CACHE_NAME);
  } catch {
    /* cache storage unavailable: nothing to clear */
  }
};
