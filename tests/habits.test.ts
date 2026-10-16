import { describe, expect, it } from 'vitest';
import type { HabitSettings, RecordEntry } from '../types';
import { getLocalDateString } from '../constants';
import {
  DAY_MS, HOUR_MS, DEFAULT_HABIT_SETTINGS, evaluateHealthReminders, formatElapsed,
  getCooldownEnd, getHabitSummary, getRecordInterval, parseHabitSettings, parseSessionTimer, resolveDraftTimestamp,
  timerToDraft, validateHabitSettings,
} from '../utils/habits';
import { parseRecordEntriesFromCsv, serializeRecordsToCsv } from '../utils/csv';

const now = new Date(2026, 9, 16, 15, 30).getTime();
const today = getLocalDateString(new Date(now));
const record = (id: string, timestamp: number, durationMinutes?: number): RecordEntry => ({ id, timestamp, durationMinutes });
const settings: HabitSettings = { ...DEFAULT_HABIT_SETTINGS, dailyEnabled: true, dailyLimit: 2,
  durationEnabled: true, minDurationMinutes: 5, intervalEnabled: true, minIntervalHours: 2 };

describe('elapsed time and streaks', () => {
  it('uses completed 24-hour periods, rather than a midnight boundary', () => {
    const beforeMidnight = new Date(2026, 9, 15, 23, 59).getTime();
    const afterMidnight = new Date(2026, 9, 16, 0, 1).getTime();
    expect(getHabitSummary([record('a', beforeMidnight)], afterMidnight).currentMs).toBe(120000);
    expect(formatElapsed(afterMidnight - beforeMidnight)).toBe('2分钟');
    expect(formatElapsed(3 * DAY_MS + 8 * HOUR_MS)).toBe('3天8小时');
  });
  it('counts real elapsed time across a daylight-saving offset change', () => {
    const start = Date.parse('2026-03-08T01:30:00-05:00');
    const end = Date.parse('2026-03-09T01:30:00-04:00');
    expect(formatElapsed(end - start)).toBe('23小时0分钟');
  });
  it('does not invent a streak before the first record', () => {
    expect(getHabitSummary([], now)).toMatchObject({ currentMs: null, bestMs: null, isNewBest: false, todayCount: 0 });
  });
  it('includes the ongoing interval in the best and recognizes a new record', () => {
    const entries = [record('b', now - 5 * DAY_MS), record('a', now - 8 * DAY_MS)];
    expect(getHabitSummary(entries, now)).toMatchObject({ currentMs: 5 * DAY_MS, bestMs: 5 * DAY_MS, isNewBest: true });
    expect(entries[0].id).toBe('b');
  });
  it('recomputes the current and best intervals after edits and deletions', () => {
    const a = record('a', now - 10 * DAY_MS);
    const b = record('b', now - 4 * DAY_MS);
    const c = record('c', now - DAY_MS);
    expect(getHabitSummary([a, b, c], now)).toMatchObject({ currentMs: DAY_MS, bestMs: 6 * DAY_MS });
    expect(getHabitSummary([a, c], now).bestMs).toBe(9 * DAY_MS);
    expect(getHabitSummary([a, { ...c, timestamp: now - 2 * DAY_MS }], now).currentMs).toBe(2 * DAY_MS);
  });
  it('ignores invalid and future timestamps when computing the current streak', () => {
    expect(getHabitSummary([record('a', now - HOUR_MS), record('future', now + DAY_MS), record('invalid', NaN)], now).currentMs).toBe(HOUR_MS);
  });
  it('finds the previous event across dates, excluding the event being edited', () => {
    const a = record('a', now - DAY_MS);
    const b = record('b', now);
    expect(getRecordInterval(b, [b, a])).toBe(DAY_MS);
    expect(getRecordInterval(a, [a, b])).toBeNull();
  });
  it('clears obsolete cooldowns after historical edits or deletion of the latest event', () => {
    expect(getCooldownEnd([record('recent', now - 60000)], 30, now)).toBe(now + 29 * 60000);
    expect(getCooldownEnd([record('historical', now - DAY_MS)], 30, now)).toBeNull();
    expect(getCooldownEnd([], 30, now)).toBeNull();
  });
});

describe('threshold reminders', () => {
  it('combines the three independent conditions in a single result', () => {
    const a = record('a', now - HOUR_MS);
    const b = record('b', now, 2);
    expect(evaluateHealthReminders([a], [a, b], b, settings, [], now).map((item) => item.kind)).toEqual(['daily', 'duration', 'interval']);
  });
  it('does not repeat the daily reminder after a deletion and a later crossing', () => {
    const a = record('a', now - HOUR_MS);
    const b = record('b', now, 8);
    expect(evaluateHealthReminders([a], [a, b], b, { ...settings, intervalEnabled: false }, [today], now)).toEqual([]);
  });
  it('starts a new daily allowance on the next local date', () => {
    const a = record('a', now - HOUR_MS), b = record('b', now, 8);
    expect(evaluateHealthReminders([a], [a, b], b, { ...settings, intervalEnabled: false }, ['2026-10-15'], now).map((item) => item.kind)).toEqual(['daily']);
  });
  it('does not raise a daily reminder when import already placed the count above the limit', () => {
    const a = record('a', now - HOUR_MS), b = record('b', now - 1000), c = record('c', now, 10);
    expect(evaluateHealthReminders([a, b], [a, b, c], c, { ...settings, intervalEnabled: false }, [], now)).toEqual([]);
  });
  it('allows an edit from a historical date into today to cross the daily threshold', () => {
    const a = record('a', now - HOUR_MS), old = record('b', now - DAY_MS), edited = record('b', now, 10);
    expect(evaluateHealthReminders([a, old], [a, edited], edited, { ...settings, intervalEnabled: false }, [], now).map((item) => item.kind)).toEqual(['daily']);
  });
  it('does not alert for a backfilled historical event, including a timer crossing midnight', () => {
    const a = record('a', new Date(2026, 9, 15, 23, 58).getTime(), 4);
    expect(evaluateHealthReminders([], [a], a, { ...settings, dailyLimit: 1 }, [], now)).toEqual([]);
  });
  it('does not infer a short duration from missing duration data', () => {
    const a = record('a', now);
    expect(evaluateHealthReminders([], [a], a, { ...settings, dailyEnabled: false }, [], now)).toEqual([]);
  });
  it('treats minimum duration and interval limits as strictly below, and skips disabled rules', () => {
    const a = record('a', now - 2 * HOUR_MS), b = record('b', now, 5);
    expect(evaluateHealthReminders([a], [a, b], b, { ...settings, dailyEnabled: false }, [], now)).toEqual([]);
    expect(evaluateHealthReminders([a], [a, b], { ...b, durationMinutes: 1 }, DEFAULT_HABIT_SETTINGS, [], now)).toEqual([]);
  });
});

describe('timer persistence and compatible data', () => {
  it('restores elapsed time from timestamps after reload without counting interval ticks', () => {
    const timer = parseSessionTimer(JSON.stringify({ startedAt: now - 5 * HOUR_MS }), now)!;
    expect(timerToDraft(timer, now)).toEqual({ timestamp: now - 5 * HOUR_MS, durationMinutes: 300 });
  });
  it('freezes the finished duration while waiting for confirmation', () => {
    const timer = { startedAt: now - 360000, stoppedAt: now - 60000 };
    expect(timerToDraft(timer, now + HOUR_MS).durationMinutes).toBe(5);
  });
  it('preserves sub-minute durations through CSV backup and import', () => {
    const timer = { startedAt: now - 20000, stoppedAt: now };
    const entry = { id: 'timer', ...timerToDraft(timer, now) } as RecordEntry;
    expect(parseRecordEntriesFromCsv(serializeRecordsToCsv([entry]))[0]).toMatchObject({ timestamp: entry.timestamp, durationMinutes: entry.durationMinutes });
    expect(entry.durationMinutes).toBeGreaterThan(0);
    expect(entry.durationMinutes).toBeLessThan(1);
  });
  it('ignores corrupt or impossible persisted timer values', () => {
    for (const value of ['broken', 'null', '{}', JSON.stringify({ startedAt: now + 1 }), JSON.stringify({ startedAt: now, stoppedAt: now - 1 })]) {
      expect(parseSessionTimer(value, now)).toBeNull();
    }
  });
  it('keeps manually chosen exact timestamps and interprets date-only backfill in local time', () => {
    expect(resolveDraftTimestamp({ timestamp: now - 123456 }, now)).toBe(now - 123456);
    const resolved = new Date(resolveDraftTimestamp({ date: '2026-10-10' }, now));
    expect(getLocalDateString(resolved)).toBe('2026-10-10');
    expect(resolved.getHours()).toBe(new Date(now).getHours());
  });
  it('validates active thresholds and tolerates missing settings from older versions', () => {
    expect(parseHabitSettings(null)).toEqual(DEFAULT_HABIT_SETTINGS);
    expect(parseHabitSettings('{invalid')).toEqual(DEFAULT_HABIT_SETTINGS);
    expect(parseHabitSettings('{"dailyLimit":-1,"minIntervalHours":"2"}')).toMatchObject({ dailyLimit: null, minIntervalHours: null });
    expect(validateHabitSettings({ ...settings, dailyLimit: 1.5 })).toBeTruthy();
    expect(validateHabitSettings({ ...settings, minDurationMinutes: null })).toBeTruthy();
    expect(validateHabitSettings(settings)).toBeNull();
  });
});
