import { getLocalDateString } from '../constants';
import type { HabitSettings, HealthReminder, RecordEntry, RecordEntryDraft, SessionTimer } from '../types';

export const HABIT_SETTINGS_KEY = 'lulemo_habit_settings';
export const SESSION_TIMER_KEY = 'lulemo_session_timer';
export const DAILY_REMINDER_DAYS_KEY = 'lulemo_daily_reminder_days';
export const LAST_HEALTH_REMINDER_KEY = 'lulemo_last_health_reminder';
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const DEFAULT_HABIT_SETTINGS: HabitSettings = {
  dailyEnabled: false, dailyLimit: null,
  durationEnabled: false, minDurationMinutes: null,
  intervalEnabled: false, minIntervalHours: null,
  notificationsEnabled: false,
  reminderText: '已达到今日设定次数',
};

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

export function parseHabitSettings(raw: string | null): HabitSettings {
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object') return { ...DEFAULT_HABIT_SETTINGS };
    return {
      dailyEnabled: value.dailyEnabled === true,
      dailyLimit: positive(value.dailyLimit) && Number.isInteger(value.dailyLimit) ? value.dailyLimit : null,
      durationEnabled: value.durationEnabled === true,
      minDurationMinutes: positive(value.minDurationMinutes) ? value.minDurationMinutes : null,
      intervalEnabled: value.intervalEnabled === true,
      minIntervalHours: positive(value.minIntervalHours) ? value.minIntervalHours : null,
      notificationsEnabled: value.notificationsEnabled === true,
      reminderText: typeof value.reminderText === 'string' && value.reminderText.trim()
        ? value.reminderText.trim().slice(0, 100) : DEFAULT_HABIT_SETTINGS.reminderText,
    };
  } catch { return { ...DEFAULT_HABIT_SETTINGS }; }
}

export function validateHabitSettings(value: HabitSettings): string | null {
  if (value.dailyEnabled && (!positive(value.dailyLimit) || !Number.isInteger(value.dailyLimit))) return '请填写大于 0 的每日提醒次数（整数）';
  if (value.durationEnabled && !positive(value.minDurationMinutes)) return '请填写大于 0 的时长提醒值';
  if (value.intervalEnabled && !positive(value.minIntervalHours)) return '请填写大于 0 的间隔提醒值';
  return null;
}

export function parseSessionTimer(raw: string | null, now = Date.now()): SessionTimer | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || !positive(value.startedAt) || value.startedAt > now) return null;
    if (value.stoppedAt != null && (!positive(value.stoppedAt) || value.stoppedAt < value.startedAt || value.stoppedAt > now)) return null;
    return { startedAt: value.startedAt, ...(value.stoppedAt == null ? {} : { stoppedAt: value.stoppedAt }) };
  } catch { return null; }
}

export function timerToDraft(timer: SessionTimer, now = Date.now()): RecordEntryDraft {
  const elapsed = Math.max(1000, (timer.stoppedAt ?? now) - timer.startedAt);
  return { timestamp: timer.startedAt, durationMinutes: Number((elapsed / 60000).toFixed(3)) };
}

export function toLocalDateTimeInput(timestamp: number): string {
  const date = new Date(timestamp);
  return `${getLocalDateString(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function resolveDraftTimestamp(draft: RecordEntryDraft, now = Date.now()): number {
  if (draft.timestamp != null) return draft.timestamp;
  if (!draft.date) return now;
  // Parse date-only input in local time, rather than as UTC midnight.
  const value = new Date(`${draft.date}T00:00:00`);
  const current = new Date(now);
  value.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
  return value.getTime();
}

export function getRecordInterval(record: RecordEntry, records: RecordEntry[]): number | null {
  const previous = records.filter((entry) => entry.id !== record.id && Number.isFinite(entry.timestamp) && entry.timestamp <= record.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  return previous ? record.timestamp - previous.timestamp : null;
}

export function getHabitSummary(records: RecordEntry[], now = Date.now()) {
  const sorted = records.filter((entry) => Number.isFinite(entry.timestamp) && entry.timestamp <= now)
    .sort((a, b) => a.timestamp - b.timestamp);
  const latest = sorted.at(-1);
  const currentMs = latest ? Math.max(0, now - latest.timestamp) : null;
  let historicalMs = 0;
  for (let i = 1; i < sorted.length; i += 1) historicalMs = Math.max(historicalMs, sorted[i].timestamp - sorted[i - 1].timestamp);
  const today = getLocalDateString(new Date(now));
  return {
    latest, currentMs,
    bestMs: latest ? Math.max(historicalMs, currentMs!) : null,
    isNewBest: sorted.length >= 2 && currentMs! > historicalMs,
    todayCount: sorted.filter((entry) => getLocalDateString(new Date(entry.timestamp)) === today).length,
  };
}

export function getCooldownEnd(records: RecordEntry[], cooldownMinutes: number, now = Date.now()): number | null {
  const latest = getHabitSummary(records, now).latest;
  if (!latest) return null;
  const finishedAt = Math.min(now, latest.timestamp + (latest.durationMinutes ?? 0) * 60000);
  const end = finishedAt + cooldownMinutes * 60000;
  return end > now ? end : null;
}

export function formatElapsed(ms: number, seconds = false): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}天${hours}小时`;
  if (hours) return `${hours}小时${minutes}分钟`;
  if (minutes) return `${minutes}分钟${seconds ? `${total % 60}秒` : ''}`;
  return seconds ? `${total}秒` : '不足1分钟';
}

export function evaluateHealthReminders(
  before: RecordEntry[], after: RecordEntry[], saved: RecordEntry,
  settings: HabitSettings, dailyReminderDays: readonly string[], now = Date.now(),
): HealthReminder[] {
  const today = getLocalDateString(new Date(now));
  if (!Number.isFinite(saved.timestamp) || saved.timestamp > now || getLocalDateString(new Date(saved.timestamp)) !== today) return [];
  const countToday = (entries: RecordEntry[]) => entries.filter((entry) => entry.timestamp <= now && getLocalDateString(new Date(entry.timestamp)) === today).length;
  const reminders: HealthReminder[] = [];
  if (settings.dailyEnabled && positive(settings.dailyLimit) && !dailyReminderDays.includes(today)
    && countToday(before) < settings.dailyLimit && countToday(after) >= settings.dailyLimit) {
    reminders.push({ kind: 'daily', title: settings.reminderText || DEFAULT_HABIT_SETTINGS.reminderText,
      message: '已达到你设置的今日提醒次数。自慰没有统一的正常次数，可留意身体是否不适，以及是否影响休息和日常生活。' });
  }
  if (settings.durationEnabled && positive(settings.minDurationMinutes) && positive(saved.durationMinutes)
    && saved.durationMinutes < settings.minDurationMinutes) {
    reminders.push({ kind: 'duration', title: '本次时长低于个人提醒值',
      message: '单次时长不能判断早泄。若经常无法控制射精并感到困扰，可咨询泌尿外科或性医学门诊。' });
  }
  const interval = getRecordInterval(saved, after);
  if (settings.intervalEnabled && positive(settings.minIntervalHours) && interval != null && interval < settings.minIntervalHours * HOUR_MS) {
    reminders.push({ kind: 'interval', title: '两次记录间隔低于个人提醒值',
      message: '反复或用力摩擦可能引起皮肤不适。如有疼痛、破皮或肿胀，先暂停刺激，给身体恢复的时间。' });
  }
  return reminders;
}
