/**
 * 应用内使用的本地存储 Key 与工具函数，统一维护避免魔法字符串
 */
export const STORAGE_KEY = 'lulemo_records';
export const PIN_KEY = 'lulemo_pin';
export const THEME_KEY = 'lulemo_darkmode';
export const THEME_MODE_KEY = 'lulemo_theme_mode';
export const ICON_KEY = 'lulemo_custom_icon';
export const SOUND_KEY = 'lulemo_sound_enabled';
export const CUSTOM_SOUND_KEY = 'lulemo_custom_sound_data';
export const AGE_VERIFIED_KEY = 'lulemo_age_verified';
export const LAST_EXPORT_FILE_KEY = 'lastExportFile';
export const LAST_EXPORT_FILENAME_KEY = 'lastExportFilename';
export const SECURITY_QUESTION_KEY = 'lulemo_security_question';
export const SECURITY_ANSWER_KEY = 'lulemo_security_answer';
export const PIN_FAILED_ATTEMPTS_KEY = 'lulemo_pin_failed_attempts';
export const PIN_LOCK_UNTIL_KEY = 'lulemo_pin_lock_until';
export const CUSTOM_BACKGROUND_KEY = 'lulemo_custom_background';
export const WEBDAV_CONFIG_KEY = 'lulemo_webdav_config';
export const SAGE_MODE_DURATION_KEY = 'lulemo_sage_mode_duration_minutes';
export const SAGE_MODE_COOLDOWN_END_KEY = 'lulemo_sage_mode_cooldown_end';
export const SAGE_MODE_ENABLED_KEY = 'lulemo_sage_mode_enabled';
export const BIOMETRIC_UNLOCK_ENABLED_KEY = 'lulemo_biometric_unlock_enabled';
export const DEFAULT_SAGE_MODE_DURATION_MINUTES = 30;

export const SECURITY_QUESTIONS = [
  { id: 'pet', label: '您的第一只宠物叫什么？' },
  { id: 'city', label: '您出生的城市是？' },
  { id: 'mother', label: '您母亲的名字是？' },
  { id: 'school', label: '您的第一所学校名称是？' },
  { id: 'food', label: '您最喜欢的食物是？' },
] as const;

/** 长按判定阈值（毫秒） */
export const LONG_PRESS_THRESHOLD = 600;

/**
 * 获取本地日期字符串 (YYYY-MM-DD)，避免 UTC 时区问题
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
