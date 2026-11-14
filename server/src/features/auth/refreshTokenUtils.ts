import crypto from 'crypto';

// Only this hash is persisted; the raw refresh token never touches the database.
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export interface ConsumedRefreshToken {
  user: { toString(): string };
  expiresAt: Date;
  revokedAt?: Date | null;
}

export interface RefreshTokenStore {
  findOneAndDelete(filter: { tokenHash: string }): PromiseLike<ConsumedRefreshToken | null>;
}

/**
 * Atomically consume a refresh token: a single findOneAndDelete means that of
 * any number of concurrent or replayed requests, only one receives the document.
 * Returns the owning user id, or null if the token is unknown, already used,
 * revoked or expired.
 */
export const consumeRefreshToken = async (
  store: RefreshTokenStore,
  token: string
): Promise<string | null> => {
  const doc = await store.findOneAndDelete({ tokenHash: hashToken(token) });
  if (!doc || doc.revokedAt || Date.now() >= doc.expiresAt.getTime()) return null;
  return doc.user.toString();
};
