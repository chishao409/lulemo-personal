export interface TimerApi<TTimer> {
  clearTimeout(timerId: TTimer): void;
  setTimeout(callback: () => void, delayMs: number): TTimer;
}

export function scheduleReplacingTimeout<TTimer>(
  currentTimer: TTimer | null,
  callback: () => void,
  delayMs: number,
  api: TimerApi<TTimer>
): TTimer {
  if (currentTimer != null) {
    api.clearTimeout(currentTimer);
  }

  return api.setTimeout(callback, delayMs);
}

export function clearScheduledTimeout<TTimer>(
  currentTimer: TTimer | null,
  api: Pick<TimerApi<TTimer>, 'clearTimeout'>
): null {
  if (currentTimer != null) {
    api.clearTimeout(currentTimer);
  }

  return null;
}
