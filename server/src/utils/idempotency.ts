/**
 * Idempotent create for offline replays. A client-generated `clientRequestId` identifies one logical write: replaying
 * it (after a flaky network or an offline queue flush) returns the document created the first time instead of a
 * duplicate. A unique partial index on (userId, clientRequestId) backs this up against concurrent replays.
 */
export const isDuplicateKeyError = (err: unknown): boolean => (err as { code?: number } | null)?.code === 11000;

export const clientRequestIdPattern = /^[A-Za-z0-9_-]{8,64}$/;

export interface IdempotentResult<T> {
  doc: T;
  replayed: boolean;
}

export const createIdempotent = async <T>(
  clientRequestId: string | undefined | null,
  find: () => Promise<T | null>,
  create: () => Promise<T>,
  isDuplicate: (err: unknown) => boolean = isDuplicateKeyError
): Promise<IdempotentResult<T>> => {
  if (!clientRequestId) return { doc: await create(), replayed: false };

  const existing = await find();
  if (existing) return { doc: existing, replayed: true };

  try {
    return { doc: await create(), replayed: false };
  } catch (err) {
    // A concurrent replay won the race and inserted first: return its document
    if (isDuplicate(err)) {
      const winner = await find();
      if (winner) return { doc: winner, replayed: true };
    }
    throw err;
  }
};

/** Mongoose index definition shared by the models that accept a clientRequestId. */
export const clientRequestIdIndex = [
  { userId: 1, clientRequestId: 1 },
  { unique: true, partialFilterExpression: { clientRequestId: { $type: 'string' } } },
] as const;
