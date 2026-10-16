
export interface RecordEntry {
  id: string;
  timestamp: number;
  note?: string;
  mood?: string;
  durationMinutes?: number;
  watchedMovie?: boolean;
  movieCategory?: string;
}

export interface RecordEntryDraft {
  timestamp?: number;
  date?: string;
  mood?: string;
  note?: string;
  durationMinutes?: number;
  watchedMovie?: boolean;
  movieCategory?: string;
}

export interface HabitSettings {
  dailyEnabled: boolean;
  dailyLimit: number | null;
  durationEnabled: boolean;
  minDurationMinutes: number | null;
  intervalEnabled: boolean;
  minIntervalHours: number | null;
  notificationsEnabled: boolean;
  reminderText: string;
}

export interface SessionTimer {
  startedAt: number;
  stoppedAt?: number;
}

export interface HealthReminder {
  kind: 'daily' | 'duration' | 'interval';
  title: string;
  message: string;
}

export interface CustomBackgroundConfig {
  src: string;
  positionX: number;
  positionY: number;
  scale: number;
}

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  directory: string;
}

export interface WebDavBackupFile {
  name: string;
  url: string;
  isLatest: boolean;
  size?: number;
  lastModified?: string;
}

export type ViewType = 'calendar' | 'stats' | 'settings';

export interface DayData {
  date: string; // YYYY-MM-DD
  records: RecordEntry[];
}
