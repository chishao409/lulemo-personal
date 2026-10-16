import { describe, expect, it } from 'vitest';

import {
  APP_STORAGE_KEYS,
  PIN_SECURITY_STORAGE_KEYS,
  removeStorageKeys,
} from '../utils/appStorage';
import { StorageLike } from '../utils/storageMigration';

function createStorage(seed: Record<string, string>): StorageLike & { snapshot: () => Record<string, string> } {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    snapshot() {
      return Object.fromEntries(store.entries());
    },
  };
}

describe('app storage helpers', () => {
  it('removes only app-owned keys when clearing local data', () => {
    const seed = Object.fromEntries(APP_STORAGE_KEYS.map((key) => [key, `value:${key}`]));
    const storage = createStorage({
      ...seed,
      unrelated_key: 'keep-me',
    });

    removeStorageKeys(storage, APP_STORAGE_KEYS);

    expect(storage.snapshot()).toEqual({
      unrelated_key: 'keep-me',
    });
  });

  it('removes only PIN-related keys when resetting or deleting PIN', () => {
    const storage = createStorage({
      lulemo_records: 'records',
      lulemo_pin: 'pin',
      lulemo_security_question: 'question',
      lulemo_security_answer: 'answer',
      lulemo_pin_failed_attempts: '2',
      lulemo_pin_lock_until: '999',
    });

    removeStorageKeys(storage, PIN_SECURITY_STORAGE_KEYS);

    expect(storage.snapshot()).toEqual({
      lulemo_records: 'records',
    });
  });
});
