export const DEFAULT_MAX_PIN_ATTEMPTS = 5;
export const DEFAULT_PIN_LOCK_DURATION_MS = 30_000;

export function readStoredNumber(storage: Pick<Storage, 'getItem'>, key: string): number | null {
  const raw = storage.getItem(key);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sanitizeFailedAttempts(
  attempts: number | null,
  maxAttempts = DEFAULT_MAX_PIN_ATTEMPTS
): number {
  if (attempts == null || attempts < 0) return 0;
  return Math.min(maxAttempts, Math.floor(attempts));
}

export function sanitizeLockUntil(lockUntil: number | null, now = Date.now()): number | null {
  if (lockUntil == null || lockUntil <= now) return null;
  return lockUntil;
}

export function createPinFailureState(
  previousAttempts: number,
  now = Date.now(),
  maxAttempts = DEFAULT_MAX_PIN_ATTEMPTS,
  lockDurationMs = DEFAULT_PIN_LOCK_DURATION_MS
): {
  failedAttempts: number;
  lockUntil: number | null;
  status: string;
  shouldLock: boolean;
} {
  const nextAttempts = previousAttempts + 1;

  if (nextAttempts >= maxAttempts) {
    return {
      failedAttempts: nextAttempts,
      lockUntil: now + lockDurationMs,
      status: `尝试过多，请 ${Math.ceil(lockDurationMs / 1000)} 秒后重试`,
      shouldLock: true,
    };
  }

  return {
    failedAttempts: nextAttempts,
    lockUntil: null,
    status: `PIN 错误，还可尝试 ${maxAttempts - nextAttempts} 次`,
    shouldLock: false,
  };
}
