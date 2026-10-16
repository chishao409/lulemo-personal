import { describe, expect, it } from 'vitest';

import {
  createPinFailureState,
  DEFAULT_MAX_PIN_ATTEMPTS,
  readStoredNumber,
  sanitizeFailedAttempts,
  sanitizeLockUntil,
} from '../utils/pinLock';

describe('PIN lock helpers', () => {
  it('reads finite numbers from storage safely', () => {
    const storage = {
      getItem(key: string) {
        return key === 'ok' ? '12' : key === 'bad' ? 'x' : null;
      },
    };

    expect(readStoredNumber(storage, 'ok')).toBe(12);
    expect(readStoredNumber(storage, 'bad')).toBeNull();
    expect(readStoredNumber(storage, 'missing')).toBeNull();
  });

  it('sanitizes failed attempt counters and lock timestamps', () => {
    expect(sanitizeFailedAttempts(-1)).toBe(0);
    expect(sanitizeFailedAttempts(9, DEFAULT_MAX_PIN_ATTEMPTS)).toBe(DEFAULT_MAX_PIN_ATTEMPTS);
    expect(sanitizeFailedAttempts(2.8)).toBe(2);
    expect(sanitizeLockUntil(999, 1000)).toBeNull();
    expect(sanitizeLockUntil(1001, 1000)).toBe(1001);
  });

  it('locks only after the max attempts threshold is reached', () => {
    expect(createPinFailureState(0, 1000, 5, 30_000)).toEqual({
      failedAttempts: 1,
      lockUntil: null,
      status: 'PIN 错误，还可尝试 4 次',
      shouldLock: false,
    });

    expect(createPinFailureState(4, 1000, 5, 30_000)).toEqual({
      failedAttempts: 5,
      lockUntil: 31_000,
      status: '尝试过多，请 30 秒后重试',
      shouldLock: true,
    });
  });
});
