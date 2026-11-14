import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDueReminders, localNow, inQuietHours, parseClockToMinutes, isSatisfied, DEFAULT_PREFS, ReminderPrefs, TodayStatus, LocalNow,
} from '../src/features/reminders/reminders.logic';
import { putRemindersSchema } from '../src/features/reminders/reminders.schema';

const idle: TodayStatus = { waterTotalMl: 0, waterGoalMl: 2500, weightLoggedToday: false, workoutPerformedToday: false, sleepLoggedToday: false, mealMinutesToday: [] };
const at = (h: number, m: number, weekday = 1, date = '2026-03-09'): LocalNow => ({ date, minutes: h * 60 + m, weekday });
const prefs = (over: Partial<ReminderPrefs> = {}, enabled = true): ReminderPrefs => ({
  reminders: DEFAULT_PREFS.reminders.map((r) => ({ ...r, enabled })),
  quietHours: { enabled: false, start: '22:30', end: '07:00' },
  ...over,
});
const ids = (due: { id: string }[]) => due.map((d) => d.id);

test('defaults are all disabled (opt-in) and nothing is due', () => {
  assert.ok(DEFAULT_PREFS.reminders.every((r) => !r.enabled));
  assert.deepEqual(computeDueReminders(DEFAULT_PREFS, at(10, 0), idle), []);
});

test('a reminder is due from its time for the window, not before and not after', () => {
  const p = prefs();
  assert.deepEqual(ids(computeDueReminders(p, at(9, 59), idle)), []);
  assert.deepEqual(ids(computeDueReminders(p, at(10, 0), idle)), ['water:10:00']);
  assert.deepEqual(ids(computeDueReminders(p, at(10, 15), idle)), ['water:10:00']);
  assert.deepEqual(ids(computeDueReminders(p, at(10, 16), idle)), []);
  assert.deepEqual(ids(computeDueReminders(p, at(10, 25), idle, 30)), ['water:10:00']); // custom window
});

test('disabled reminders and unselected weekdays are skipped', () => {
  const p = prefs();
  p.reminders.find((r) => r.type === 'water')!.enabled = false;
  assert.deepEqual(ids(computeDueReminders(p, at(10, 0), idle)), []);
  const weekdays = prefs();
  weekdays.reminders.find((r) => r.type === 'water')!.days = [1, 3, 5];
  assert.deepEqual(ids(computeDueReminders(weekdays, at(10, 0, 1), idle)), ['water:10:00']); // Monday
  assert.deepEqual(ids(computeDueReminders(weekdays, at(10, 0, 2), idle)), []); // Tuesday
});

test('suppression: water goal reached, weight logged, workout performed, sleep logged', () => {
  const p = prefs();
  assert.deepEqual(ids(computeDueReminders(p, at(10, 0), { ...idle, waterTotalMl: 2499 })), ['water:10:00']);
  assert.deepEqual(ids(computeDueReminders(p, at(10, 0), { ...idle, waterTotalMl: 2500 })), []);
  assert.deepEqual(ids(computeDueReminders(p, at(7, 30), idle)), ['weight:07:30']);
  assert.deepEqual(ids(computeDueReminders(p, at(7, 30), { ...idle, weightLoggedToday: true })), []);
  assert.deepEqual(ids(computeDueReminders(p, at(18, 0), idle)), ['water:18:00', 'workout:18:00']);
  assert.deepEqual(ids(computeDueReminders(p, at(18, 0), { ...idle, workoutPerformedToday: true })), ['water:18:00']);
  assert.deepEqual(ids(computeDueReminders(p, at(22, 0), idle)), ['sleep:22:00']);
  assert.deepEqual(ids(computeDueReminders(p, at(22, 0), { ...idle, sleepLoggedToday: true })), []);
  assert.equal(isSatisfied('water', '10:00', at(10, 0), { ...idle, waterGoalMl: 0 }), false); // no goal known: never "satisfied"
});

test('meal reminders are suppressed only by a meal logged in that slot', () => {
  const p = prefs();
  const lunchDue = at(13, 5);
  assert.deepEqual(ids(computeDueReminders(p, lunchDue, idle)), ['meal:13:00']);
  // breakfast at 08:10 does not cover lunch
  assert.deepEqual(ids(computeDueReminders(p, lunchDue, { ...idle, mealMinutesToday: [8 * 60 + 10] })), ['meal:13:00']);
  // a meal logged 12:30 (within the hour before) or 13:02 covers the 13:00 slot
  assert.deepEqual(ids(computeDueReminders(p, lunchDue, { ...idle, mealMinutesToday: [12 * 60 + 30] })), []);
  assert.deepEqual(ids(computeDueReminders(p, lunchDue, { ...idle, mealMinutesToday: [13 * 60 + 2] })), []);
  // a meal logged after "now" (future/clock skew) does not suppress
  assert.deepEqual(ids(computeDueReminders(p, lunchDue, { ...idle, mealMinutesToday: [14 * 60] })), ['meal:13:00']);
  // 11:50 is more than an hour before 13:00
  assert.deepEqual(ids(computeDueReminders(p, lunchDue, { ...idle, mealMinutesToday: [11 * 60 + 50] })), ['meal:13:00']);
});

test('quiet hours, including ranges that wrap midnight', () => {
  const q = { enabled: true, start: '22:30', end: '07:00' };
  assert.equal(inQuietHours(q, 22 * 60 + 29), false);
  assert.equal(inQuietHours(q, 22 * 60 + 30), true);
  assert.equal(inQuietHours(q, 0), true);
  assert.equal(inQuietHours(q, 6 * 60 + 59), true);
  assert.equal(inQuietHours(q, 7 * 60), false);
  assert.equal(inQuietHours({ ...q, enabled: false }, 0), false);
  assert.equal(inQuietHours({ enabled: true, start: '09:00', end: '17:00' }, 12 * 60), true); // same-day range
  assert.equal(inQuietHours({ enabled: true, start: '09:00', end: '09:00' }, 9 * 60), false); // empty range

  const p = prefs({ quietHours: q });
  assert.deepEqual(ids(computeDueReminders(p, at(7, 30), idle)), ['weight:07:30']); // outside quiet hours
  const early = prefs({ quietHours: q });
  early.reminders.find((r) => r.type === 'weight')!.times = ['06:30'];
  assert.deepEqual(ids(computeDueReminders(early, at(6, 35), idle)), []); // scheduled and now inside quiet hours
  // reminder scheduled just before quiet hours but now inside them stays silent
  assert.deepEqual(ids(computeDueReminders(prefs({ quietHours: { enabled: true, start: '22:05', end: '07:00' } }), at(22, 10), idle)), []);
  // a reminder scheduled inside quiet hours never fires, even if now has just left them
  const late = prefs({ quietHours: { enabled: true, start: '22:30', end: '07:00' } });
  late.reminders.find((r) => r.type === 'weight')!.times = ['06:55'];
  assert.deepEqual(ids(computeDueReminders(late, at(7, 5), idle)), []);
});

test('localNow converts an instant to the wall clock of the user timezone (near-midnight cases)', () => {
  const instant = new Date('2026-03-08T23:30:00Z');
  assert.deepEqual(localNow(instant, 'Asia/Kolkata'), { date: '2026-03-09', minutes: 5 * 60, weekday: 1 });
  assert.deepEqual(localNow(instant, 'America/Los_Angeles'), { date: '2026-03-08', minutes: 16 * 60 + 30, weekday: 0 });
  assert.deepEqual(localNow(new Date('2026-01-01T00:00:00Z'), 'UTC'), { date: '2026-01-01', minutes: 0, weekday: 4 });
  // midnight is 00:00, never 24:00
  assert.equal(localNow(new Date('2026-03-09T07:00:00Z'), 'America/Los_Angeles').minutes, 0);
});

test('DST: wall-clock minutes jump at spring-forward and repeat at fall-back', () => {
  // US spring forward 2026-03-08: 01:59 PST -> 03:00 PDT
  assert.equal(localNow(new Date('2026-03-08T09:59:00Z'), 'America/Los_Angeles').minutes, 1 * 60 + 59);
  assert.equal(localNow(new Date('2026-03-08T10:00:00Z'), 'America/Los_Angeles').minutes, 3 * 60);
  // US fall back 2026-11-01: 01:30 happens twice (PDT then PST)
  assert.equal(localNow(new Date('2026-11-01T08:30:00Z'), 'America/Los_Angeles').minutes, 1 * 60 + 30);
  assert.equal(localNow(new Date('2026-11-01T09:30:00Z'), 'America/Los_Angeles').minutes, 1 * 60 + 30);

  const p = prefs();
  p.reminders.find((r) => r.type === 'water')!.times = ['02:30', '03:05'];
  const lowWindow = (iso: string) => ids(computeDueReminders(p, localNow(new Date(iso), 'America/Los_Angeles'), idle));
  assert.deepEqual(lowWindow('2026-03-08T10:10:00Z'), ['water:03:05']); // 03:10 PDT: 03:05 is due
  assert.deepEqual(lowWindow('2026-03-08T10:00:00Z'), []); // 02:30 does not exist that day: skipped, not misfired
  // fall back: a 01:30 reminder is due in both occurrences of 01:30 (clients dedupe by day+id)
  const fb = prefs();
  fb.reminders.find((r) => r.type === 'water')!.times = ['01:30'];
  const due = (iso: string) => ids(computeDueReminders(fb, localNow(new Date(iso), 'America/Los_Angeles'), idle));
  assert.deepEqual(due('2026-11-01T08:30:00Z'), ['water:01:30']);
  assert.deepEqual(due('2026-11-01T09:30:00Z'), ['water:01:30']);
});

test('results are sorted by time and carry date and a message', () => {
  const p = prefs();
  p.reminders.find((r) => r.type === 'water')!.times = ['18:00'];
  const due = computeDueReminders(p, at(18, 5), idle);
  assert.deepEqual(ids(due), ['water:18:00', 'workout:18:00']);
  assert.ok(due.every((d) => d.date === '2026-03-09' && d.message.length > 0));
});

test('parseClockToMinutes handles 12h and 24h meal times', () => {
  assert.equal(parseClockToMinutes('12:45 PM'), 12 * 60 + 45);
  assert.equal(parseClockToMinutes('12:05 AM'), 5);
  assert.equal(parseClockToMinutes('7:30 am'), 7 * 60 + 30);
  assert.equal(parseClockToMinutes('08:05'), 8 * 60 + 5);
  assert.equal(parseClockToMinutes('23:59'), 23 * 60 + 59);
  assert.equal(parseClockToMinutes('24:00'), null);
  assert.equal(parseClockToMinutes('13:00 PM'), null);
  assert.equal(parseClockToMinutes('noon'), null);
  assert.equal(parseClockToMinutes(undefined), null);
});

test('PUT validation: HH:MM, max times, known types, unique entries', () => {
  const ok = (body: unknown) => putRemindersSchema.safeParse({ body }).success;
  const good = { reminders: [{ type: 'water', enabled: true, times: ['09:00', '13:30'], days: [1, 2] }], quietHours: { enabled: true, start: '22:00', end: '06:30' } };
  assert.equal(ok(good), true);
  assert.equal(ok({ reminders: [] }), true);
  for (const bad of ['24:00', '9:00', '09:60', 'ab:cd', '', '09:00:00']) {
    assert.equal(ok({ reminders: [{ type: 'water', enabled: true, times: [bad] }] }), false, bad);
  }
  assert.equal(ok({ reminders: [{ type: 'coffee', enabled: true, times: ['09:00'] }] }), false);
  assert.equal(ok({ reminders: [{ type: 'water', enabled: true, times: Array.from({ length: 9 }, (_, i) => `0${i}:00`) }] }), false);
  assert.equal(ok({ reminders: [{ type: 'water', enabled: true, times: ['09:00', '09:00'] }] }), false);
  assert.equal(ok({ reminders: [{ type: 'water', enabled: true, times: [] }, { type: 'water', enabled: false, times: [] }] }), false);
  assert.equal(ok({ reminders: [{ type: 'water', enabled: true, times: ['09:00'], days: [7] }] }), false);
  assert.equal(ok({ reminders: [{ type: 'water', enabled: 'yes', times: [] }] }), false);
  assert.equal(ok({ reminders: [], quietHours: { enabled: true, start: '25:00', end: '06:00' } }), false);
});

import { loadClientModule } from './helpers/loadClientModule';
const { loadIds, addId, filterUndismissed, DISMISSED_PREFIX } = loadClientModule('client/src/utils/reminderDismissals.ts');
const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), raw: m };
};

test('client dismissals are remembered per reminder per day', () => {
  const s = memory();
  assert.deepEqual(loadIds(s, DISMISSED_PREFIX, '2026-03-09'), []);
  assert.deepEqual(addId(s, DISMISSED_PREFIX, '2026-03-09', 'water:10:00'), ['water:10:00']);
  assert.deepEqual(addId(s, DISMISSED_PREFIX, '2026-03-09', 'water:10:00'), ['water:10:00']); // idempotent
  assert.deepEqual(addId(s, DISMISSED_PREFIX, '2026-03-09', 'meal:13:00'), ['water:10:00', 'meal:13:00']);
  assert.deepEqual(loadIds(s, DISMISSED_PREFIX, '2026-03-10'), []); // a new day starts clean
  const due = [{ id: 'water:10:00' }, { id: 'weight:07:30' }];
  assert.deepEqual(filterUndismissed(due, loadIds(s, DISMISSED_PREFIX, '2026-03-09')), [{ id: 'weight:07:30' }]);
});

test('client dismissals degrade gracefully when storage is blocked or corrupted', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadIds(broken, DISMISSED_PREFIX, 'd'), []);
  assert.deepEqual(addId(broken, DISMISSED_PREFIX, 'd', 'x'), ['x']); // still hides it for this session
  assert.deepEqual(loadIds(null, DISMISSED_PREFIX, 'd'), []);
  const s = memory();
  s.setItem(DISMISSED_PREFIX + 'd', '{not json');
  assert.deepEqual(loadIds(s, DISMISSED_PREFIX, 'd'), []);
  s.setItem(DISMISSED_PREFIX + 'd', JSON.stringify([1, 'ok', null]));
  assert.deepEqual(loadIds(s, DISMISSED_PREFIX, 'd'), ['ok']);
});
