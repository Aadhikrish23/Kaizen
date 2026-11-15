// Pure admin rules. No I/O.
import { literalMatcher } from '../externalFood/externalFood.query';

/** Email/name search with the query matched literally (never as a regex). */
export const userSearchFilter = (q?: string): Record<string, unknown> => {
  const m = q ? literalMatcher(q) : null;
  return m ? { $or: [{ email: m }, { name: m }] } : {};
};

/** Global foods only: custom foods (isCustom true, owned by a user) can never match. */
export const globalFoodFilter = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ ...extra, isCustom: false });

export const foodSearchFilter = (q?: string): Record<string, unknown> => {
  const m = q ? literalMatcher(q) : null;
  return globalFoodFilter(m ? { $or: [{ name: m }, { brand: m }] } : {});
};

export interface AdminUserPatch {
  role?: 'user' | 'admin';
  isActive?: boolean;
}

/**
 * An admin may not demote or deactivate their own account (prevents locking everyone out / accidental self-demotion).
 * Returns an error message, or null when the change is allowed.
 */
export const selfModificationError = (actorId: string, targetId: string, patch: AdminUserPatch): string | null => {
  if (String(actorId) !== String(targetId)) return null;
  if (patch.role !== undefined && patch.role !== 'admin') return 'You cannot remove your own admin role';
  if (patch.isActive === false) return 'You cannot deactivate your own account';
  return null;
};

export interface AdminCountInput {
  /** Active admins other than the target (counted in the same operation as the write). */
  otherActiveAdmins: number;
  targetIsActiveAdmin: boolean;
}

/**
 * The last remaining active admin cannot be demoted or deactivated. Returns an error message or null.
 * Residual race: two admins demoting each other at the same instant can both pass this check (no transaction).
 */
export const lastAdminError = (patch: AdminUserPatch, c: AdminCountInput): string | null => {
  if (!c.targetIsActiveAdmin || c.otherActiveAdmins > 0) return null;
  const demotes = patch.role !== undefined && patch.role !== 'admin';
  const deactivates = patch.isActive === false;
  return demotes || deactivates ? 'At least one active admin must remain' : null;
};

/** The e-mail of the account an old migration script used to create with a publicly known password. */
export const LEGACY_DEFAULT_ADMIN_EMAIL = 'admin@kaizen.com';

/** Operator-facing warning (never includes secrets), or null when no such admin exists. */
export const defaultAdminWarning = (users: Array<{ email?: string; role?: string; isActive?: boolean }>): string | null => {
  const hit = users.filter((u) => (u.email || '').toLowerCase() === LEGACY_DEFAULT_ADMIN_EMAIL && u.role === 'admin' && u.isActive !== false);
  return hit.length
    ? `SECURITY: an active admin account with the legacy default e-mail ${LEGACY_DEFAULT_ADMIN_EMAIL} exists. It may have a publicly known password. Demote or delete it and rotate its refresh tokens (see docs/admin.md).`
    : null;
};

/** Fields that may be returned for a user. passwordHash, tokens and other internals are never included. */
export const USER_PUBLIC_FIELDS = ['email', 'name', 'role', 'isActive', 'onboardingComplete', 'timezone', 'createdAt', 'updatedAt'] as const;

export const toPublicUser = (u: any) => ({
  id: String(u._id),
  email: u.email,
  name: u.name,
  role: u.role || 'user',
  isActive: u.isActive !== false,
  onboardingComplete: !!u.onboardingComplete,
  timezone: u.timezone || 'UTC',
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

export const toPublicFood = (f: any) => ({
  id: String(f._id),
  name: f.name,
  brand: f.brand,
  servingSize: f.servingSize,
  basis: f.basis,
  servingQty: f.servingQty,
  servingUnit: f.servingUnit,
  calories: f.calories,
  protein: f.protein,
  carbs: f.carbs,
  fat: f.fat,
  source: f.source,
  updatedAt: f.updatedAt,
});

export type AuditAction = 'user.update' | 'food.create' | 'food.update' | 'food.delete';

export interface AuditEntryInput {
  adminId: string;
  action: AuditAction;
  targetType: 'user' | 'food';
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/** The persisted audit record: who, what, target and the changed fields (never secrets). */
export const buildAuditEntry = (i: AuditEntryInput) => ({
  adminId: i.adminId,
  action: i.action,
  targetType: i.targetType,
  targetId: i.targetId,
  before: i.before ?? null,
  after: i.after ?? null,
});

/** Only the keys of `after` whose value differs from `before`, for compact audit details. */
export const changedFields = (before: Record<string, unknown>, after: Record<string, unknown>) => {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key] ?? null;
      a[key] = after[key];
    }
  }
  return { before: b, after: a };
};

export interface StatsInput {
  totalUsers: number;
  activeUserIds: Array<unknown>; // distinct user ids with any log in the last 7 days
  totals: Record<string, number>;
  last7: Record<string, number>;
}

export const buildStats = (i: StatsInput) => ({
  users: { total: i.totalUsers, active7d: new Set(i.activeUserIds.map(String)).size },
  logs: Object.fromEntries(Object.keys(i.totals).map((k) => [k, { total: i.totals[k], last7d: i.last7[k] ?? 0 }])),
});
