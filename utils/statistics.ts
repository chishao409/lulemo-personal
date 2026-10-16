import type { RecordEntry } from '../types';
import { getLocalDateString } from '../constants';

export type ReportPeriod = 'day' | 'week' | 'month';
export interface PeriodRange { start: number; end: number }
export interface TrendPoint {
  label: string; detail: string; count: number | null;
  totalMinutes: number | null; averageMinutes: number | null; durationCount: number;
}
const HOUR = 3600000;
export const TIME_BANDS = ['00–04时', '04–08时', '08–12时', '12–16时', '16–20时', '20–24时'];
export const INTERVAL_BANDS = ['不足6小时', '6～24小时', '1～3天', '3～7天', '7天及以上'];
const INTERVAL_LIMITS = [6 * HOUR, 24 * HOUR, 72 * HOUR, 168 * HOUR, Infinity];
export const PERIOD_NAMES = { day: '日', week: '周', month: '月' };

export function getPeriodRange(period: ReportPeriod, anchor: number): PeriodRange {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === 'month') start.setDate(1);
  const end = new Date(start);
  if (period === 'month') end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + (period === 'week' ? 7 : 1));
  return { start: start.getTime(), end: end.getTime() };
}

export function shiftPeriod(period: ReportPeriod, anchor: number, direction: number): number {
  const date = new Date(getPeriodRange(period, anchor).start);
  if (period === 'month') date.setMonth(date.getMonth() + direction);
  else date.setDate(date.getDate() + direction * (period === 'week' ? 7 : 1));
  return date.getTime();
}

export function validStatisticsRecords(records: RecordEntry[], now: number): RecordEntry[] {
  return records.filter(r => Number.isFinite(r.timestamp) && Number.isFinite(new Date(r.timestamp).getTime()) && r.timestamp <= now);
}

export function getYearStatistics(records: RecordEntry[], year: number, now: number) {
  const months = Array.from({ length: 12 }, (_, index) => ({ name: `${index + 1}月`, count: 0 }));
  for (const record of validStatisticsRecords(records, now)) {
    const date = new Date(record.timestamp);
    if (date.getFullYear() === year) months[date.getMonth()].count += 1;
  }
  const count = months.reduce((sum, item) => sum + item.count, 0);
  return { months, count, monthlyAverage: count / 12 };
}

function durationSummary(records: RecordEntry[]) {
  const durations = records.map(r => r.durationMinutes).filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  const totalMinutes = durations.reduce((a, b) => a + b, 0);
  return { durationCount: durations.length, totalMinutes, averageMinutes: durations.length ? totalMinutes / durations.length : null };
}

// Mirror local calendar progress, rather than subtracting fixed millisecond days (DST).
function getPreviousCutoff(period: ReportPeriod, previous: PeriodRange, now: number): number {
  const current = new Date(now);
  const cutoff = new Date(previous.start);
  if (period === 'month') {
    const lastDay = new Date(previous.end - 1).getDate();
    if (current.getDate() > lastDay) return previous.end;
    cutoff.setDate(current.getDate());
  } else if (period === 'week') cutoff.setDate(cutoff.getDate() + (current.getDay() + 6) % 7);
  cutoff.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
  return Math.min(previous.end, cutoff.getTime() + 1);
}

export function buildPeriodReport(records: RecordEntry[], period: ReportPeriod, anchor: number, now: number) {
  const range = getPeriodRange(period, anchor);
  const isCurrent = now >= range.start && now < range.end;
  const cutoff = Math.min(range.end, now + 1);
  const previousRange = getPeriodRange(period, shiftPeriod(period, anchor, -1));
  const previousCutoff = isCurrent ? getPreviousCutoff(period, previousRange, now) : previousRange.end;
  const sorted = validStatisticsRecords(records, now).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  const selected = sorted.filter(r => r.timestamp >= range.start && r.timestamp < cutoff);
  const previous = sorted.filter(r => r.timestamp >= previousRange.start && r.timestamp < previousCutoff);
  const durations = durationSummary(selected);
  const priorDurations = durationSummary(previous);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].timestamp >= range.start && sorted[i].timestamp < cutoff) intervals.push(sorted[i].timestamp - sorted[i - 1].timestamp);
  }
  const timeDistribution = TIME_BANDS.map(label => ({ label, count: 0 }));
  selected.forEach(r => { timeDistribution[Math.floor(new Date(r.timestamp).getHours() / 4)].count += 1; });
  const intervalDistribution = INTERVAL_BANDS.map(label => ({ label, count: 0 }));
  intervals.forEach(ms => { intervalDistribution[INTERVAL_LIMITS.findIndex(limit => ms < limit)].count += 1; });
  const trend: TrendPoint[] = [];
  const cursor = new Date(range.start);
  while (cursor.getTime() < range.end) {
    const start = cursor.getTime();
    const label = period === 'day' ? `${String(cursor.getHours()).padStart(2, '0')}时` : `${cursor.getMonth() + 1}/${cursor.getDate()}`;
    // Actual elapsed hours preserve both repeated hours when a timezone observes DST.
    const end = period === 'day' ? start + HOUR : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1).getTime();
    const entries = selected.filter(r => r.timestamp >= start && r.timestamp < end);
    const summary = durationSummary(entries);
    trend.push({ label, detail: period === 'day' ? `${new Date(start).toLocaleString('zh-CN', { hour12: false })} 起1小时` : getLocalDateString(cursor),
      count: start < cutoff ? entries.length : null,
      totalMinutes: summary.durationCount ? summary.totalMinutes : null, averageMinutes: summary.averageMinutes, durationCount: summary.durationCount });
    cursor.setTime(end);
  }
  const maxBand = Math.max(...timeDistribution.map(d => d.count));
  return {
    period, range, cutoff, previousRange, previousCutoff, isCurrent, count: selected.length, ...durations,
    previousCount: previous.length, previousDurations: priorDurations,
    countChange: selected.length - previous.length,
    percentChange: previous.length ? (selected.length - previous.length) / previous.length * 100 : null,
    intervals, averageIntervalMs: intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null,
    activeDays: new Set(selected.map(r => getLocalDateString(new Date(r.timestamp)))).size,
    trend, timeDistribution, intervalDistribution,
    peakBands: maxBand ? timeDistribution.filter(d => d.count === maxBand).map(d => d.label) : [],
  };
}

export type PeriodReport = ReturnType<typeof buildPeriodReport>;
export function formatMinutes(value: number): string {
  if (value > 0 && value < 0.01) return '<0.01';
  return Number(value.toFixed(2)).toString();
}
export function describeCountChange(report: PeriodReport): string {
  if (!report.countChange) return '与上期持平';
  const direction = report.countChange > 0 ? '增加' : '减少';
  return `比上期${direction}${Math.abs(report.countChange)}次${report.percentChange == null ? '' : `（${Math.abs(report.percentChange).toFixed(1)}%）`}`;
}

export function describeReport(report: PeriodReport): string[] {
  const lines = [`本周期共记录${report.count}次，分布在${report.activeDays}天。`];
  if (!report.count) return ['本周期暂无记录。未记录不代表没有发生，可通过补录完善统计。'];
  lines.push(report.durationCount
    ? `其中${report.durationCount}次有时长，已记录总时长${formatMinutes(report.totalMinutes)}分钟，平均${formatMinutes(report.averageMinutes!)}分钟。`
    : '这些记录均未填写有效时长，暂不计算总时长和平均时长。');
  if (report.peakBands.length === 1) lines.push(`记录最集中的时段为${report.peakBands[0]}。`);
  else if (report.peakBands.length) lines.push(`并列最多的时段为${report.peakBands.join('、')}。`);
  lines.push(`${describeCountChange(report)}${report.isCurrent ? '，按相同进度比较' : '，按完整周期比较'}。`);
  if (report.count < 3) lines.push('记录较少，时段分布仅描述现有数据。');
  return lines;
}
