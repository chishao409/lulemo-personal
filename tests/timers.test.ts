import { describe, expect, it } from 'vitest';

import { clearScheduledTimeout, scheduleReplacingTimeout, TimerApi } from '../utils/timers';

interface MockTask {
  callback: () => void;
  delayMs: number;
}

function createTimerApi() {
  let nextId = 1;
  const tasks = new Map<number, MockTask>();
  const cleared: number[] = [];

  const api: TimerApi<number> = {
    clearTimeout(timerId: number) {
      cleared.push(timerId);
      tasks.delete(timerId);
    },
    setTimeout(callback: () => void, delayMs: number) {
      const timerId = nextId;
      nextId += 1;
      tasks.set(timerId, { callback, delayMs });
      return timerId;
    },
  };

  return {
    api,
    cleared,
    run(timerId: number) {
      tasks.get(timerId)?.callback();
    },
    has(timerId: number) {
      return tasks.has(timerId);
    },
  };
}

describe('timer helpers', () => {
  it('replaces the previous timeout before scheduling a new one', () => {
    const timer = createTimerApi();
    const calls: string[] = [];

    const first = scheduleReplacingTimeout(null, () => calls.push('first'), 3000, timer.api);
    const second = scheduleReplacingTimeout(first, () => calls.push('second'), 3000, timer.api);

    expect(timer.cleared).toEqual([first]);
    expect(timer.has(first)).toBe(false);
    expect(timer.has(second)).toBe(true);

    timer.run(second);

    expect(calls).toEqual(['second']);
  });

  it('clears an existing timeout and returns null', () => {
    const timer = createTimerApi();
    const scheduled = scheduleReplacingTimeout(null, () => undefined, 3000, timer.api);

    expect(clearScheduledTimeout(scheduled, timer.api)).toBeNull();
    expect(timer.cleared).toEqual([scheduled]);
    expect(timer.has(scheduled)).toBe(false);
  });
});
