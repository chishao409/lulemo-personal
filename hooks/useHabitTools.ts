import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import type { HabitSettings, HealthReminder, RecordEntry, SessionTimer } from '../types';
import { getLocalDateString } from '../constants';
import {
  DAILY_REMINDER_DAYS_KEY, DEFAULT_HABIT_SETTINGS, HABIT_SETTINGS_KEY, LAST_HEALTH_REMINDER_KEY,
  SESSION_TIMER_KEY, evaluateHealthReminders, parseHabitSettings, parseSessionTimer, validateHabitSettings,
} from '../utils/habits';
import { clearHabitNotification, requestHabitNotificationPermission, sendHabitNotification } from '../utils/notifications';

function readDays(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(DAILY_REMINDER_DAYS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)) : [];
  } catch { return []; }
}

export function useHabitTools(showToast: (message: string) => void) {
  const [settings, setSettings] = useState(() => parseHabitSettings(localStorage.getItem(HABIT_SETTINGS_KEY)));
  const [timer, setTimer] = useState(() => parseSessionTimer(localStorage.getItem(SESSION_TIMER_KEY)));
  const [now, setNow] = useState(Date.now());
  const [reminders, setReminders] = useState<HealthReminder[]>([]);
  const timerRef = useRef(timer);
  const reminderDays = useRef(readDays());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, timer && !timer.stoppedAt ? 1000 : 30000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    let cancelled = false;
    let removeNative: (() => Promise<void>) | undefined;
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.addListener('appStateChange', tick).then((handle) => {
        if (cancelled) void handle.remove(); else removeNative = () => handle.remove();
      }).catch(console.warn);
    }
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
      void removeNative?.();
    };
  }, [timer]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let cancelled = false;
    let remove: (() => Promise<void>) | undefined;
    void LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      if (!action.notification.extra?.habitReminder) return;
      try {
        const saved = JSON.parse(localStorage.getItem(LAST_HEALTH_REMINDER_KEY) || '[]');
        if (Array.isArray(saved)) setReminders(saved.filter((item) => item && ['daily', 'duration', 'interval'].includes(item.kind) && typeof item.title === 'string' && typeof item.message === 'string'));
      } catch { /* Ignore an invalid saved reminder. */ }
    }).then((handle) => {
      if (cancelled) void handle.remove(); else remove = () => handle.remove();
    }).catch(console.warn);
    return () => { cancelled = true; void remove?.(); };
  }, []);

  const saveTimer = useCallback((next: SessionTimer | null): boolean => {
    try {
      if (next) localStorage.setItem(SESSION_TIMER_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_TIMER_KEY);
      timerRef.current = next;
      setTimer(next);
      setNow(Date.now());
      return true;
    } catch { showToast('无法保存计时状态，请检查本地存储空间'); return false; }
  }, [showToast]);

  const startTimer = useCallback(() => {
    if (!timerRef.current) saveTimer({ startedAt: Date.now() });
  }, [saveTimer]);

  const stopTimer = useCallback((): SessionTimer | null => {
    const current = timerRef.current;
    if (!current) return null;
    const next = { ...current, stoppedAt: current.stoppedAt ?? Math.max(current.startedAt, Date.now()) };
    return saveTimer(next) ? next : null;
  }, [saveTimer]);

  const saveSettings = useCallback(async (next: HabitSettings): Promise<string> => {
    const error = validateHabitSettings(next);
    if (error) return error;
    const normalized = parseHabitSettings(JSON.stringify(next));
    let permissionDenied = false;
    if (normalized.notificationsEnabled) {
      try { permissionDenied = !await requestHabitNotificationPermission(); }
      catch { permissionDenied = true; }
    }
    if (permissionDenied) normalized.notificationsEnabled = false;
    try {
      localStorage.setItem(HABIT_SETTINGS_KEY, JSON.stringify(normalized));
      setSettings(normalized);
      if (!normalized.notificationsEnabled) void clearHabitNotification().catch(console.warn);
      return permissionDenied ? '设置已保存；系统通知未获授权，仍会在应用内提醒。安卓安装后可再次开启通知。' : '提醒设置已保存';
    } catch { return '保存失败，请检查本地存储空间'; }
  }, []);

  const checkReminders = useCallback((before: RecordEntry[], after: RecordEntry[], saved: RecordEntry) => {
    const current = Date.now();
    setNow(current);
    const next = evaluateHealthReminders(before, after, saved, settings, reminderDays.current, current);
    if (!next.length) return;
    if (next.some((item) => item.kind === 'daily')) {
      reminderDays.current = [...reminderDays.current, getLocalDateString(new Date(current))];
    }
    try {
      localStorage.setItem(DAILY_REMINDER_DAYS_KEY, JSON.stringify(reminderDays.current));
      localStorage.setItem(LAST_HEALTH_REMINDER_KEY, JSON.stringify(next));
    } catch { showToast('记录已保存，但提醒状态保存失败'); }
    setReminders(next);
    if (settings.notificationsEnabled) {
      const body = next.some((item) => item.kind === 'daily') ? settings.reminderText : '已达到你设置的提醒条件，请在应用内查看';
      void sendHabitNotification(body).then((sent) => {
        if (!sent) showToast('系统通知不可用，请在应用内查看提醒');
      }).catch(() => showToast('系统通知发送失败，请在应用内查看提醒'));
    }
  }, [settings, showToast]);

  const reset = useCallback(() => {
    timerRef.current = null;
    reminderDays.current = [];
    setTimer(null);
    setReminders([]);
    setSettings({ ...DEFAULT_HABIT_SETTINGS });
    void clearHabitNotification().catch(console.warn);
  }, []);

  return { settings, saveSettings, timer, startTimer, stopTimer, saveTimer, now, reminders, setReminders, checkReminders, reset };
}
