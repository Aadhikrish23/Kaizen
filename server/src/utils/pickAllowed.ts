/**
 * Mass-assignment guard. `validateRequest` only validates: it does NOT replace req.body with the parsed value, and zod
 * objects only strip unknown keys when parsed. So anything that reaches a Mongoose write must be copied through an
 * explicit whitelist like this one. Keys are derived from the zod schemas (see `bodyKeys`) so they cannot drift.
 */
export const pickAllowed = (data: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(Object.entries(data as Record<string, unknown>).filter(([k]) => keys.includes(k)));
};

/** Keys of the `body` object of a `z.object({ body: z.object({...}) })` schema. */
export const bodyKeys = (schema: { shape: { body: { shape: Record<string, unknown> } } }): string[] => Object.keys(schema.shape.body.shape);

/** Fields that only the server may set; must never be writable from a client body. */
export const SERVER_OWNED_KEYS = ['_id', 'id', 'userId', 'createdAt', 'updatedAt', '__v', 'isCustom'] as const;
