import { describe, expect, it } from 'vitest';
import type { RecordEntry } from '../types';
import { buildPeriodReport, describeCountChange, describeReport, getPeriodRange, getYearStatistics, shiftPeriod } from '../utils/statistics';

const at = (year: number, month: number, day: number, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute).getTime();
const now = at(2026, 10, 16, 15, 30);
const entry = (id: string, timestamp: number, durationMinutes?: number): RecordEntry => ({ id, timestamp, durationMinutes });

describe('local reporting periods', () => {
  it('starts weeks on Monday even when the anchor is Sunday', () => {
    expect(getPeriodRange('week', at(2026, 10, 18, 23))).toEqual({ start: at(2026, 10, 12), end: at(2026, 10, 19) });
  });
  it('handles leap February and cross-year navigation', () => {
    expect(getPeriodRange('month', at(2024, 2, 29))).toEqual({ start: at(2024, 2, 1), end: at(2024, 3, 1) });
    expect(shiftPeriod('month', at(2026, 1, 31), -1)).toBe(at(2025, 12, 1));
    expect(shiftPeriod('week', at(2026, 1, 1), 1)).toBe(at(2026, 1, 5));
    expect(shiftPeriod('day', at(2026, 1, 1), -1)).toBe(at(2025, 12, 31));
  });
  it('constructs local day boundaries even across timezone offset changes', () => {
    const range = getPeriodRange('day', at(2026, 3, 8, 12));
    expect(range).toEqual({ start: at(2026, 3, 8), end: at(2026, 3, 9) });
    const expectedHours = 24 + (new Date(range.end).getTimezoneOffset() - new Date(range.start).getTimezoneOffset()) / 60;
    expect(buildPeriodReport([], 'day', range.start, at(2026, 3, 10)).trend).toHaveLength(expectedHours);
  });
  it('preserves repeated hours on a fall-back day', () => {
    const range = getPeriodRange('day', at(2026, 11, 1));
    const report = buildPeriodReport([], 'day', range.start, at(2026, 11, 2));
    expect(report.trend.length).toBe((range.end - range.start) / 3600000);
  });
});

describe('count and duration aggregation', () => {
  it('excludes missing, zero, negative and nonfinite durations from the denominator', () => {
    const values = [2, 0.5, undefined, 0, -1, NaN, Infinity];
    const report = buildPeriodReport(values.map((v, i) => entry(`${i}`, at(2026, 10, 2, i), v)), 'month', now, now);
    expect(report).toMatchObject({ count: 7, durationCount: 2, totalMinutes: 2.5, averageMinutes: 1.25, activeDays: 1 });
  });
  it('does not fabricate duration data for legacy records', () => {
    const report = buildPeriodReport([entry('old', at(2026, 10, 2))], 'month', now, now);
    expect(report).toMatchObject({ count: 1, durationCount: 0, averageMinutes: null });
    expect(report.trend[1]).toMatchObject({ count: 1, totalMinutes: null, averageMinutes: null });
    expect(describeReport(report).join('')).toContain('均未填写');
  });
  it('uses half-open period boundaries and starts, including a session crossing midnight', () => {
    const records = [entry('before', at(2026, 9, 30, 23, 59), 10), entry('start', at(2026, 10, 1), 5), entry('end', at(2026, 11, 1))];
    expect(buildPeriodReport(records, 'month', now, at(2026, 12, 1)).count).toBe(1);
    expect(buildPeriodReport(records, 'day', at(2026, 9, 30), now).totalMinutes).toBe(10);
  });
  it('ignores invalid and future timestamps without mutating the input order', () => {
    const records = [entry('future', now + 1), entry('valid', now), entry('nan', NaN), entry('outside-date-range', 9e15)];
    const original = records.map(r => r.id);
    expect(buildPeriodReport(records, 'day', now, now).count).toBe(1);
    expect(records.map(r => r.id)).toEqual(original);
  });
  it('fills elapsed empty buckets with zero count but future buckets with null', () => {
    const report = buildPeriodReport([entry('a', at(2026, 10, 2, 10), 1), entry('b', at(2026, 10, 2, 11), 3)], 'month', now, now);
    expect(report.trend).toHaveLength(31);
    expect(report.trend[0]).toMatchObject({ count: 0, totalMinutes: null });
    expect(report.trend[1]).toMatchObject({ count: 2, totalMinutes: 4, averageMinutes: 2 });
    expect(report.trend[15].count).toBe(0);
    expect(report.trend[16].count).toBeNull();
  });
  it('provides explicit empty summary without assigning a health score', () => {
    const report = buildPeriodReport([], 'week', now, now);
    expect(report).toMatchObject({ count: 0, averageIntervalMs: null, peakBands: [] });
    expect(describeReport(report)[0]).toContain('未记录不代表没有发生');
  });
});

describe('fair previous-period comparisons', () => {
  it('compares today with yesterday only through the same clock time, inclusive of now', () => {
    const report = buildPeriodReport([entry('today', now), entry('yesterday', at(2026, 10, 15, 15, 30)), entry('later', at(2026, 10, 15, 16))], 'day', now, now);
    expect(report).toMatchObject({ count: 1, previousCount: 1, countChange: 0 });
    expect(report.previousCutoff).toBe(at(2026, 10, 15, 15, 30) + 1);
  });
  it('compares weeks by weekday and local clock', () => {
    const report = buildPeriodReport([entry('friday', at(2026, 10, 9, 15)), entry('saturday', at(2026, 10, 10))], 'week', now, now);
    expect(report.previousRange.start).toBe(at(2026, 10, 5));
    expect(report.previousCutoff).toBe(at(2026, 10, 9, 15, 30) + 1);
    expect(report.previousCount).toBe(1);
  });
  it('compares current months through the same day and time', () => {
    const report = buildPeriodReport([entry('prior', at(2026, 9, 16, 15)), entry('later', at(2026, 9, 16, 16)), entry('later-day', at(2026, 9, 17))], 'month', now, now);
    expect(report.previousCutoff).toBe(at(2026, 9, 16, 15, 30) + 1);
    expect(report.previousCount).toBe(1);
  });
  it('caps progress at the prior month end when that month has fewer days', () => {
    const march = at(2026, 3, 31, 12);
    expect(buildPeriodReport([], 'month', march, march).previousCutoff).toBe(at(2026, 3, 1));
  });
  it('compares whole historical months rather than the current day of month', () => {
    const report = buildPeriodReport([entry('aug-end', at(2026, 8, 31, 23, 59))], 'month', at(2026, 9, 5), now);
    expect(report).toMatchObject({ isCurrent: false, previousCount: 1, previousCutoff: at(2026, 9, 1) });
  });
  it('does not divide by zero or invent a percentage without a baseline', () => {
    const report = buildPeriodReport([entry('a', now)], 'day', now, now);
    expect(report.percentChange).toBeNull();
    expect(describeCountChange(report)).toBe('比上期增加1次');
    expect(describeCountChange(buildPeriodReport([], 'day', now, now))).toBe('与上期持平');
  });
  it('describes increases and decreases against a nonzero baseline', () => {
    const report = buildPeriodReport([entry('a', at(2026, 10, 15, 1)), entry('b', at(2026, 10, 15, 2)), entry('c', now)], 'day', now, now);
    expect(report.percentChange).toBe(-50);
    expect(describeCountChange(report)).toBe('比上期减少1次（50.0%）');
  });
});

describe('time and interval distributions', () => {
  it('assigns exact four-hour boundaries to the following band', () => {
    const report = buildPeriodReport([0, 4, 8, 12, 16, 20, 23].map((h, i) => entry(`${i}`, at(2026, 10, 15, h))), 'day', at(2026, 10, 15), now);
    expect(report.timeDistribution.map(d => d.count)).toEqual([1, 1, 1, 1, 1, 2]);
    expect(report.peakBands).toEqual(['20–24时']);
  });
  it('reports tied peak bands honestly', () => {
    const report = buildPeriodReport([entry('a', at(2026, 10, 15, 1)), entry('b', at(2026, 10, 15, 5))], 'day', at(2026, 10, 15), now);
    expect(report.peakBands).toHaveLength(2);
    expect(describeReport(report).join('')).toContain('并列最多');
  });
  it('includes an interval starting outside the selected period but excludes the first ever entry', () => {
    const records = [entry('old', at(2026, 9, 30, 23)), entry('new', at(2026, 10, 1, 1))];
    expect(buildPeriodReport(records, 'month', now, now).intervals).toEqual([2 * 3600000]);
    expect(buildPeriodReport(records, 'month', at(2026, 9, 1), now).intervals).toEqual([]);
  });
  it('places exact 6h/24h/3d/7d boundaries in the next bin, including simultaneous starts', () => {
    const gaps = [0, 5, 6, 24, 72, 168];
    let timestamp = at(2026, 9, 1);
    const records = [entry('start', timestamp), ...gaps.map((hours, i) => entry(`${i}`, timestamp += hours * 3600000))];
    const report = buildPeriodReport(records, 'month', at(2026, 9, 1), now);
    expect(report.intervalDistribution.map(d => d.count)).toEqual([2, 1, 1, 1, 1]);
    expect(report.intervals).toHaveLength(6);
  });
  it('recalculates after backfills, edits and deletions', () => {
    const a = entry('a', at(2026, 10, 2));
    const b = entry('b', at(2026, 10, 4));
    const c = entry('c', at(2026, 10, 8));
    expect(buildPeriodReport([a, b, c], 'month', now, now).intervals).toEqual([48 * 3600000, 96 * 3600000]);
    expect(buildPeriodReport([a, c], 'month', now, now).intervals).toEqual([144 * 3600000]);
    expect(buildPeriodReport([a, { ...c, timestamp: at(2026, 9, 1) }], 'month', now, now).count).toBe(1);
  });
});

describe('annual legacy totals', () => {
  it('uses the requested year consistently for totals, average and monthly bars', () => {
    const report = getYearStatistics([entry('2025', at(2025, 10, 1)), entry('a', at(2026, 1, 1)), entry('b', now), entry('invalid', NaN), entry('future', now + 1)], 2026, now);
    expect(report.count).toBe(2);
    expect(report.monthlyAverage).toBe(2 / 12);
    expect(report.months[0].count).toBe(1);
    expect(report.months[9].count).toBe(1);
    expect(report.months.reduce((n, m) => n + m.count, 0)).toBe(report.count);
  });
});
