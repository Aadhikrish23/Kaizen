import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../src/features/auth/User';
import { protect, isAccountActive } from '../src/middleware/auth.middleware';
import { adminOnly } from '../src/middleware/admin.middleware';
import { rateLimitedResponse } from '../src/middleware/aiRateLimit';
import { adminRateLimitMax } from '../src/middleware/adminRateLimit';
import { getJwtSecret } from '../src/config/secrets';
import * as authService from '../src/features/auth/auth.service';
import {
  selfModificationError, lastAdminError, defaultAdminWarning, toPublicUser, toPublicFood, buildAuditEntry, changedFields, buildStats, userSearchFilter, foodSearchFilter, USER_PUBLIC_FIELDS,
} from '../src/features/admin/admin.logic';
import {
  updateUserSchema, createFoodSchema, updateFoodSchema, listUsersSchema, listFoodsSchema, foodIdSchema, FOOD_WRITE_KEYS, USER_PATCH_KEYS,
} from '../src/features/admin/admin.schema';

const ID = '64b000000000000000000001';
const run = (mw: any, req: any) => new Promise<{ next: any; status?: number; body?: any }>((resolve) => {
  const res: any = { status(c: number) { this.code = c; return this; }, json(b: any) { resolve({ next: undefined, status: this.code, body: b }); } };
  mw(req, res, (arg?: any) => resolve({ next: arg === undefined ? 'ok' : arg }));
});

test('adminOnly: non-admin and missing users get 403, admins pass', async () => {
  assert.equal((await run(adminOnly, { user: { role: 'user' } })).status, 403);
  assert.equal((await run(adminOnly, { user: {} })).status, 403);
  assert.equal((await run(adminOnly, {})).status, 403);
  const denied = await run(adminOnly, { user: { role: 'user' } });
  assert.equal(denied.body.success, false);
  assert.equal(denied.body.error.code, 'FORBIDDEN');
  assert.equal((await run(adminOnly, { user: { role: 'admin' } })).next, 'ok');
});

const withUser = async (user: any, fn: () => Promise<void>) => {
  const original = (User as any).findById;
  (User as any).findById = () => ({ select: async () => user });
  try { await fn(); } finally { (User as any).findById = original; }
};
const bearer = (id = ID) => ({ headers: { authorization: `Bearer ${jwt.sign({ id }, getJwtSecret())}` } });

test('protect: unauthenticated is 401; a deactivated user cannot authenticate even with a valid token', async () => {
  const none = await run(protect, { headers: {} });
  assert.equal(none.next.statusCode, 401);
  const bad = await run(protect, { headers: { authorization: 'Bearer not.a.token' } });
  assert.equal(bad.next.statusCode, 401);

  await withUser({ _id: ID, role: 'user', isActive: true }, async () => {
    const req: any = bearer();
    assert.equal((await run(protect, req)).next, 'ok');
    assert.equal(req.user.role, 'user');
  });
  await withUser({ _id: ID, role: 'user' }, async () => { // legacy document without the field
    assert.equal((await run(protect, bearer())).next, 'ok');
  });
  await withUser({ _id: ID, role: 'admin', isActive: false }, async () => {
    const r = await run(protect, bearer());
    assert.equal(r.next.statusCode, 401);
    assert.equal(r.next.code, 'ACCOUNT_DISABLED');
  });
  await withUser(null, async () => {
    assert.equal((await run(protect, bearer())).next.statusCode, 401);
  });
  assert.equal(isAccountActive({ isActive: false }), false);
  assert.equal(isAccountActive({}), true);
  assert.equal(isAccountActive(null), false);
});

test('login is refused for a deactivated account (after the password check) and still works for active ones', async () => {
  const hash = await bcrypt.hash('secret-pass-1', 4);
  const original = (User as any).findOne;
  try {
    (User as any).findOne = async () => ({ passwordHash: hash, isActive: false, id: ID, email: 'a@b.c' });
    await assert.rejects(authService.login({ email: 'a@b.c', password: 'secret-pass-1' }), (e: any) => e.statusCode === 403 && e.code === 'ACCOUNT_DISABLED');
    // wrong password on a deactivated account still looks like a normal credential failure
    await assert.rejects(authService.login({ email: 'a@b.c', password: 'wrong' }), (e: any) => e.statusCode === 401 && e.code === 'INVALID_CREDENTIALS');
  } finally {
    (User as any).findOne = original;
  }
});

test('self-modification is blocked: an admin cannot demote or deactivate themselves, but can change others', () => {
  assert.match(selfModificationError(ID, ID, { role: 'user' })!, /admin role/);
  assert.match(selfModificationError(ID, ID, { isActive: false })!, /deactivate/);
  assert.match(selfModificationError(ID, ID, { role: 'user', isActive: true })!, /admin role/);
  assert.equal(selfModificationError(ID, ID, { role: 'admin' }), null);
  assert.equal(selfModificationError(ID, ID, { isActive: true }), null);
  assert.equal(selfModificationError(ID, '64b000000000000000000002', { role: 'user', isActive: false }), null);
});

test('user patch is strict: only role (user|admin) and isActive, nothing else, at least one field', () => {
  const ok = (body: unknown, id = ID) => updateUserSchema.safeParse({ params: { id }, body }).success;
  assert.equal(ok({ role: 'admin' }), true);
  assert.equal(ok({ isActive: false }), true);
  assert.equal(ok({ role: 'user', isActive: true }), true);
  assert.equal(ok({}), false);
  for (const key of ['email', 'passwordHash', 'xp', '_id', 'userId', 'onboardingComplete', 'timezone', 'name', 'createdAt']) {
    assert.equal(ok({ role: 'user', [key]: 'x' }), false, key);
  }
  assert.equal(ok({ role: 'superadmin' }), false);
  assert.equal(ok({ isActive: 'false' }), false);
  assert.equal(ok({ role: 'admin' }, 'not-an-id'), false);
  assert.equal(ok({ role: 'admin' }, '$ne'), false);
  assert.deepEqual([...USER_PATCH_KEYS].sort(), ['isActive', 'role']);
});

test('global food bodies are strict and cannot set server-owned fields', () => {
  const good = { name: 'Oats', servingSize: '40 g', calories: 150, protein: 5, carbs: 27, fat: 3, basis: 'per_serving' };
  const create = (b: unknown) => createFoodSchema.safeParse({ body: b }).success;
  const update = (b: unknown, id = ID) => updateFoodSchema.safeParse({ params: { id }, body: b }).success;
  assert.equal(create(good), true);
  for (const key of ['isCustom', 'userId', '_id', 'source', 'createdAt', 'externalId']) {
    assert.equal(create({ ...good, [key]: key === 'isCustom' ? true : 'x' }), false, `create ${key}`);
    assert.equal(update({ name: 'New', [key]: 'x' }), false, `update ${key}`);
  }
  assert.equal(create({ ...good, calories: -1 }), false);
  assert.equal(create({ ...good, calories: 1e9 }), false);
  assert.equal(create({ name: 'x', servingSize: '1', calories: 1 }), false); // name too short
  assert.equal(update({}), false);
  assert.equal(update({ calories: 200 }), true);
  assert.equal(foodIdSchema.safeParse({ params: { id: 'zzz' } }).success, false);
  assert.ok(!FOOD_WRITE_KEYS.some((k) => ['isCustom', 'userId', '_id', 'source'].includes(k)));
});

test('list queries are bounded and q is a plain string', () => {
  const u = (query: unknown) => listUsersSchema.safeParse({ query }).success;
  assert.equal(u({}), true);
  assert.equal(u({ page: '2', limit: '50', q: 'ada' }), true);
  assert.equal(u({ limit: '101' }), false);
  assert.equal(u({ limit: '0' }), false);
  assert.equal(u({ page: '0' }), false);
  assert.equal(u({ q: 'x'.repeat(101) }), false);
  assert.equal(u({ q: { $ne: 'x' } }), false);
  assert.equal(listFoodsSchema.safeParse({ query: { q: ['a', 'b'] } }).success, false);
  assert.equal(listUsersSchema.parse({ query: {} }).query.limit, 25);
});

test('responses never contain passwordHash, tokens or other internals', () => {
  const doc = {
    _id: ID, email: 'a@b.c', name: 'A', role: 'user', isActive: true, passwordHash: '$2a$x', refreshToken: 'tok', tokenHash: 'h',
    onboardingComplete: true, timezone: 'UTC', heightCm: 180, createdAt: 'c', updatedAt: 'u', __v: 3,
  };
  const out: any = toPublicUser(doc);
  assert.deepEqual(Object.keys(out).sort(), ['createdAt', 'email', 'id', 'isActive', 'name', 'onboardingComplete', 'role', 'timezone', 'updatedAt']);
  const text = JSON.stringify(out);
  for (const secret of ['passwordHash', '$2a$x', 'tok', 'tokenHash', 'heightCm']) assert.ok(!text.includes(secret), secret);
  assert.equal(toPublicUser({ _id: ID, email: 'x@y.z' }).isActive, true); // legacy users are active
  assert.ok(USER_PUBLIC_FIELDS.every((f) => !/password|token/i.test(f)));
  const food: any = toPublicFood({ _id: ID, name: 'Oats', userId: 'owner', isCustom: false, calories: 1, protein: 1, carbs: 1, fat: 1 });
  assert.ok(!('userId' in food) && !('isCustom' in food));
});

test('search filters are literal, and food filters can never include custom foods', () => {
  const uf: any = userSearchFilter('.*');
  assert.equal(uf.$or[0].email.test('someone@example.com'), false);
  assert.ok(uf.$or[0].email.test('a.*b@x.y'));
  assert.deepEqual(userSearchFilter(undefined), {});
  assert.deepEqual(userSearchFilter(''), {});
  for (const q of [undefined, 'oats', '.*', '(a+)+$']) {
    assert.equal((foodSearchFilter(q) as any).isCustom, false, String(q));
  }
  assert.equal((foodSearchFilter('.*') as any).$or[0].name.test('Oats'), false);
});

test('audit entries record who, what and the target, with only changed fields', () => {
  const diff = changedFields({ role: 'user', isActive: true }, { role: 'admin', isActive: true });
  assert.deepEqual(diff, { before: { role: 'user' }, after: { role: 'admin' } });
  const entry = buildAuditEntry({ adminId: ID, action: 'user.update', targetType: 'user', targetId: '64b000000000000000000002', ...diff });
  assert.deepEqual(entry, { adminId: ID, action: 'user.update', targetType: 'user', targetId: '64b000000000000000000002', before: { role: 'user' }, after: { role: 'admin' } });
  assert.equal(buildAuditEntry({ adminId: ID, action: 'food.delete', targetType: 'food', targetId: 'x' }).before, null);
});

test('stats combine counts and count distinct active users once', () => {
  const s = buildStats({ totalUsers: 10, activeUserIds: ['a', 'b', 'a', { toString: () => 'c' }], totals: { meals: 5, water: 2 }, last7: { meals: 3 } });
  assert.deepEqual(s, { users: { total: 10, active7d: 3 }, logs: { meals: { total: 5, last7d: 3 }, water: { total: 2, last7d: 0 } } });
});

test('admin rate limit is configurable with a safe default; 429 uses the standard shape', () => {
  assert.equal(adminRateLimitMax({} as any), 300);
  assert.equal(adminRateLimitMax({ ADMIN_RATE_LIMIT_PER_15MIN: '50' } as any), 50);
  assert.equal(adminRateLimitMax({ ADMIN_RATE_LIMIT_PER_15MIN: 'x' } as any), 300);
  assert.equal(rateLimitedResponse().error.code, 'RATE_LIMITED');
});

test('last-admin protection: the only active admin cannot be demoted or deactivated', () => {
  const only = { otherActiveAdmins: 0, targetIsActiveAdmin: true };
  assert.match(lastAdminError({ role: 'user' }, only)!, /At least one/);
  assert.match(lastAdminError({ isActive: false }, only)!, /At least one/);
  assert.match(lastAdminError({ role: 'user', isActive: false }, only)!, /At least one/);
  assert.equal(lastAdminError({ role: 'admin' }, only), null);
  assert.equal(lastAdminError({ isActive: true }, only), null);
  assert.equal(lastAdminError({ role: 'user' }, { otherActiveAdmins: 1, targetIsActiveAdmin: true }), null);
  assert.equal(lastAdminError({ role: 'user' }, { otherActiveAdmins: 0, targetIsActiveAdmin: false }), null);
});

test('default admin warning only for an active admin with the legacy e-mail and never leaks secrets', () => {
  assert.equal(defaultAdminWarning([]), null);
  assert.equal(defaultAdminWarning([{ email: 'admin@kaizen.com', role: 'user' }]), null);
  assert.equal(defaultAdminWarning([{ email: 'admin@kaizen.com', role: 'admin', isActive: false }]), null);
  assert.equal(defaultAdminWarning([{ email: 'someone@x.io', role: 'admin' }]), null);
  const w = defaultAdminWarning([{ email: 'Admin@Kaizen.com', role: 'admin' }])!;
  assert.match(w, /SECURITY/);
  assert.ok(!new RegExp('admin' + '123').test(w));
});

test('the old migration script no longer creates any user or default credentials', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../src/scripts/migrateData.ts'), 'utf8');
  assert.ok(!new RegExp('admin' + '123').test(src));
  assert.ok(!/User\.create/.test(src));
});
