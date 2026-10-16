import {
  AGE_VERIFIED_KEY,
  BIOMETRIC_UNLOCK_ENABLED_KEY,
  CUSTOM_BACKGROUND_KEY,
  CUSTOM_SOUND_KEY,
  ICON_KEY,
  LAST_EXPORT_FILENAME_KEY,
  LAST_EXPORT_FILE_KEY,
  PIN_FAILED_ATTEMPTS_KEY,
  PIN_KEY,
  PIN_LOCK_UNTIL_KEY,
  SAGE_MODE_COOLDOWN_END_KEY,
  SAGE_MODE_DURATION_KEY,
  SAGE_MODE_ENABLED_KEY,
  SECURITY_ANSWER_KEY,
  SECURITY_QUESTION_KEY,
  SOUND_KEY,
  STORAGE_KEY,
  THEME_KEY,
  THEME_MODE_KEY,
  WEBDAV_CONFIG_KEY,
} from '../constants';

import { StorageLike, StorageKeyPair } from './storageMigration';

export const APP_STORAGE_KEYS = [
  STORAGE_KEY,
  PIN_KEY,
  THEME_KEY,
  THEME_MODE_KEY,
  ICON_KEY,
  SOUND_KEY,
  CUSTOM_SOUND_KEY,
  AGE_VERIFIED_KEY,
  LAST_EXPORT_FILE_KEY,
  LAST_EXPORT_FILENAME_KEY,
  SECURITY_QUESTION_KEY,
  SECURITY_ANSWER_KEY,
  PIN_FAILED_ATTEMPTS_KEY,
  PIN_LOCK_UNTIL_KEY,
  CUSTOM_BACKGROUND_KEY,
  WEBDAV_CONFIG_KEY,
  SAGE_MODE_DURATION_KEY,
  SAGE_MODE_COOLDOWN_END_KEY,
  SAGE_MODE_ENABLED_KEY,
  BIOMETRIC_UNLOCK_ENABLED_KEY,
] as const;

export const PIN_SECURITY_STORAGE_KEYS = [
  PIN_KEY,
  SECURITY_QUESTION_KEY,
  SECURITY_ANSWER_KEY,
  PIN_FAILED_ATTEMPTS_KEY,
  PIN_LOCK_UNTIL_KEY,
] as const;

export const LEGACY_STORAGE_KEY_PAIRS: StorageKeyPair[] = [
  { next: STORAGE_KEY, legacy: 'luleme_records' },
  { next: PIN_KEY, legacy: 'luleme_pin' },
  { next: THEME_KEY, legacy: 'luleme_darkmode' },
  { next: ICON_KEY, legacy: 'luleme_custom_icon' },
  { next: SOUND_KEY, legacy: 'luleme_sound_enabled' },
  { next: CUSTOM_SOUND_KEY, legacy: 'luleme_custom_sound_data' },
  { next: AGE_VERIFIED_KEY, legacy: 'luleme_age_verified' },
  { next: SECURITY_QUESTION_KEY, legacy: 'luleme_security_question' },
  { next: SECURITY_ANSWER_KEY, legacy: 'luleme_security_answer' },
  { next: PIN_FAILED_ATTEMPTS_KEY, legacy: 'luleme_pin_failed_attempts' },
  { next: PIN_LOCK_UNTIL_KEY, legacy: 'luleme_pin_lock_until' },
  { next: CUSTOM_BACKGROUND_KEY, legacy: 'luleme_custom_background' },
  { next: SAGE_MODE_DURATION_KEY, legacy: 'luleme_sage_mode_duration_minutes' },
  { next: SAGE_MODE_COOLDOWN_END_KEY, legacy: 'luleme_sage_mode_cooldown_end' },
  { next: SAGE_MODE_ENABLED_KEY, legacy: 'luleme_sage_mode_enabled' },
  { next: BIOMETRIC_UNLOCK_ENABLED_KEY, legacy: 'luleme_biometric_unlock_enabled' },
];

export function removeStorageKeys(storage: StorageLike, keys: readonly string[]): void {
  for (const key of keys) {
    storage.removeItem(key);
  }
}
