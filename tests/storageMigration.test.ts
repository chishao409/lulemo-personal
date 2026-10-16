import { describe, expect, it } from 'vitest';

import { migrateStorageKeys, StorageLike } from '../utils/storageMigration';

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

describe('storage migration', () => {
  it('moves legacy values into new keys when the new key is empty', () => {
    const storage = createStorage({ legacy_pin: '1234' });

    migrateStorageKeys(storage, [{ legacy: 'legacy_pin', next: 'next_pin' }]);

    expect(storage.snapshot()).toEqual({ next_pin: '1234' });
  });

  it('keeps the current key value and still removes the legacy key', () => {
    const storage = createStorage({ legacy_pin: 'old', next_pin: 'current' });

    migrateStorageKeys(storage, [{ legacy: 'legacy_pin', next: 'next_pin' }]);

    expect(storage.snapshot()).toEqual({ next_pin: 'current' });
  });
});
