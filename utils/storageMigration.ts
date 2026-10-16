export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageKeyPair {
  next: string;
  legacy: string;
}

export function migrateStorageKeys(storage: StorageLike, keyPairs: StorageKeyPair[]): void {
  for (const { next, legacy } of keyPairs) {
    const legacyValue = storage.getItem(legacy);
    if (legacyValue == null) continue;

    if (storage.getItem(next) == null) {
      storage.setItem(next, legacyValue);
    }

    storage.removeItem(legacy);
  }
}
