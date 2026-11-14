import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidTimezone, dateStringInTz, todayInTz, addDaysTz, weekdayOfDate, dateRange } from '../src/utils/dates';

test('isValidTimezone', () => {
  assert.ok(isValidTimezone('UTC'));
  assert.ok(isValidTimezone('Asia/Kolkata'));
  assert.ok(isValidTimezone('America/Los_Angeles'));
  assert.equal(isValidTimezone('Mars/Olympus'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(undefined), false);
  assert.equal(isValidTimezone(42), false);
});

test('same instant lands on different calendar dates per zone (near midnight)', () => {
  const instant = new Date('2026-03-08T23:30:00Z');
  assert.equal(dateStringInTz(instant, 'UTC'), '2026-03-08');
  assert.equal(dateStringInTz(instant, 'Asia/Kolkata'), '2026-03-09'); // 05:00 next day
  assert.equal(dateStringInTz(instant, 'America/Los_Angeles'), '2026-03-08'); // 16:30 (PDT began that morning)
  assert.equal(dateStringInTz(new Date('2026-03-09T00:30:00Z'), 'America/Los_Angeles'), '2026-03-08');
  assert.equal(dateStringInTz(new Date('2026-03-09T07:30:00Z'), 'America/Los_Angeles'), '2026-03-09');
});

test('todayInTz uses the injected clock and falls back to UTC for bad zones', () => {
  const now = new Date('2026-01-01T02:00:00Z');
  assert.equal(todayInTz('America/New_York', now), '2025-12-31');
  assert.equal(todayInTz('Pacific/Auckland', now), '2026-01-01');
  assert.equal(todayInTz('Not/AZone', now), '2026-01-01');
  assert.equal(todayInTz(undefined, now), '2026-01-01');
});

test('DST transitions do not break day boundaries', () => {
  // US spring forward 2026-03-08 (23-hour day), fall back 2026-11-01 (25-hour day)
  assert.equal(dateStringInTz(new Date('2026-03-08T07:59:59Z'), 'America/Los_Angeles'), '2026-03-07');
  assert.equal(dateStringInTz(new Date('2026-03-08T08:00:00Z'), 'America/Los_Angeles'), '2026-03-08');
  assert.equal(dateStringInTz(new Date('2026-11-01T06:59:59Z'), 'America/Los_Angeles'), '2026-10-31');
  assert.equal(dateStringInTz(new Date('2026-11-01T07:00:00Z'), 'America/Los_Angeles'), '2026-11-01');
  assert.equal(dateStringInTz(new Date('2026-11-02T07:59:59Z'), 'America/Los_Angeles'), '2026-11-01');
  assert.equal(dateStringInTz(new Date('2026-11-02T08:00:00Z'), 'America/Los_Angeles'), '2026-11-02');
});

test('addDaysTz is calendar arithmetic across DST, month and year ends, leap days', () => {
  assert.equal(addDaysTz('2026-03-07', 1), '2026-03-08');
  assert.equal(addDaysTz('2026-03-08', 1), '2026-03-09');
  assert.equal(addDaysTz('2026-11-01', -1), '2026-10-31');
  assert.equal(addDaysTz('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysTz('2028-02-28', 1), '2028-02-29');
  assert.equal(addDaysTz('2026-03-31', -30), '2026-03-01');
  assert.equal(addDaysTz('2026-05-10', 0), '2026-05-10');
});

test('weekdayOfDate and dateRange', () => {
  assert.equal(weekdayOfDate('2026-03-08'), 0); // Sunday
  assert.equal(weekdayOfDate('2026-03-09'), 1);
  assert.deepEqual(dateRange('2026-03-07', '2026-03-09'), ['2026-03-07', '2026-03-08', '2026-03-09']);
  assert.deepEqual(dateRange('2026-03-09', '2026-03-09'), ['2026-03-09']);
  assert.deepEqual(dateRange('2026-03-10', '2026-03-09'), []);
});
