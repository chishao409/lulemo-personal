import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const HABIT_NOTIFICATION_ID = 26001;
const CHANNEL = 'habit-reminders';

export async function requestHabitNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  let status = await LocalNotifications.checkPermissions();
  if (status.display !== 'granted') status = await LocalNotifications.requestPermissions();
  return status.display === 'granted';
}

export async function sendHabitNotification(body: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const status = await LocalNotifications.checkPermissions();
  if (status.display !== 'granted') return false;
  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({ id: CHANNEL, name: '个人提醒', importance: 3, visibility: 0 });
  }
  // Omitting schedule posts immediately and does not require exact alarm access.
  await LocalNotifications.schedule({ notifications: [{
    id: HABIT_NOTIFICATION_ID, title: '个人提醒', body,
    channelId: CHANNEL, smallIcon: 'ic_stat_habit',
    extra: { habitReminder: true },
  }] });
  return true;
}

export async function clearHabitNotification(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const delivered = await LocalNotifications.getDeliveredNotifications();
  const notifications = delivered.notifications.filter((item) => item.id === HABIT_NOTIFICATION_ID);
  if (notifications.length) await LocalNotifications.removeDeliveredNotifications({ notifications });
}
