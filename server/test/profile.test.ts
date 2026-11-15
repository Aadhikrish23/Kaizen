import test from 'node:test';
import assert from 'node:assert/strict';
import { updateProfileSchema, completeOnboardingSchema, PROFILE_UPDATE_KEYS, ONBOARDING_KEYS, pickAllowed } from '../src/features/profile/profile.schema';
import { formatUserResponse } from '../src/features/auth/auth.service';

const update = (body: unknown) => updateProfileSchema.safeParse({ body }).success;
const onboarding = (body: unknown) => completeOnboardingSchema.safeParse({ body }).success;

test('profile update rejects mass-assignment of privileged or internal fields', () => {
  for (const key of ['email', 'passwordHash', 'role', 'xp', 'level', 'streakDays', 'healthScore', 'isPrivateProfile', '_id', 'userId', 'createdAt', 'isAdmin']) {
    assert.equal(update({ name: 'Valid Name', [key]: key === 'role' ? 'admin' : 'x' }), false, key);
  }
  assert.equal(update({ role: 'admin' }), false);
  assert.equal(update({ passwordHash: '$2a$10$abc' }), false);
  assert.equal(update({ email: 'attacker@example.com' }), false);
});

test('profile update still accepts every field the client legitimately sends', () => {
  assert.equal(update({}), true);
  assert.equal(update({
    name: 'Ada Lovelace', dob: '1990-05-01', gender: 'female', heightCm: 170, currentWeightKg: 65, targetWeightKg: 60,
    goal: 'lose_weight', targetDate: '2099-01-01', activityLevel: 'lightly_active', calorieDailyTarget: 1800,
    proteinDailyTargetG: 120, waterDailyTargetMl: 2500, units: 'metric', timezone: 'Asia/Kolkata',
  }), true);
  assert.equal(update({ timezone: 'Mars/Olympus' }), false);
});

test('onboardingComplete may only be switched on (skip onboarding), never off or to other values', () => {
  assert.equal(update({ onboardingComplete: true }), true);
  assert.equal(update({ onboardingComplete: false }), false);
  assert.equal(update({ onboardingComplete: 'true' }), false);
});

test('target weight range: 25..500 kg (the previous maximum is restored)', () => {
  assert.equal(update({ targetWeightKg: 500 }), true);
  assert.equal(update({ targetWeightKg: 450 }), true); // valid before this sprint, must keep saving
  assert.equal(update({ targetWeightKg: 501 }), false);
  assert.equal(update({ targetWeightKg: 25 }), true);
  assert.equal(update({ targetWeightKg: 24.9 }), false);
});

test('onboarding body is strict as well', () => {
  const ok = { dob: '1990-05-01', gender: 'male', heightCm: 180, currentWeightKg: 80, activityLevel: 'sedentary', goal: 'maintain_weight' };
  assert.equal(onboarding(ok), true);
  assert.equal(onboarding({ ...ok, role: 'admin' }), false);
  assert.equal(onboarding({ ...ok, onboardingComplete: false }), false);
  assert.equal(onboarding({ ...ok, email: 'x@y.z' }), false);
});

test('pickAllowed keeps whitelisted keys only (defence in depth for the service)', () => {
  const body = { name: 'A B', goal: 'lose_weight', role: 'admin', passwordHash: 'x', $set: { role: 'admin' }, email: 'e@x.y' };
  assert.deepEqual(pickAllowed(body, PROFILE_UPDATE_KEYS), { name: 'A B', goal: 'lose_weight' });
  assert.deepEqual(pickAllowed({ dob: 'd', role: 'admin' }, ONBOARDING_KEYS), { dob: 'd' });
  assert.deepEqual(pickAllowed(undefined as any, PROFILE_UPDATE_KEYS), {});
  for (const forbidden of ['email', 'passwordHash', 'role', 'xp', '_id']) {
    assert.ok(!PROFILE_UPDATE_KEYS.includes(forbidden) && !ONBOARDING_KEYS.includes(forbidden), forbidden);
  }
  assert.ok(PROFILE_UPDATE_KEYS.includes('timezone') && PROFILE_UPDATE_KEYS.includes('targetDate'));
});

test('/auth/me user shape no longer carries the stale xp/level/streakDays/healthScore placeholders', () => {
  const shaped = formatUserResponse({ _id: 'u1', name: 'A', email: 'a@b.c', xp: 0, level: 1, streakDays: 0, healthScore: 85 }) as any;
  for (const k of ['xp', 'level', 'streakDays', 'healthScore']) assert.ok(!(k in shaped), k);
  assert.equal(shaped.id, 'u1');
  assert.equal(shaped.timezone, 'UTC');
});
