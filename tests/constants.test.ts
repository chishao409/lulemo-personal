import { describe, expect, it } from 'vitest';

import { getLocalDateString } from '../constants';

describe('getLocalDateString', () => {
  it('formats local dates with zero-padded month and day', () => {
    const date = new Date(2026, 1, 7, 9, 5, 3);

    expect(getLocalDateString(date)).toBe('2026-02-07');
  });

  it('uses the local calendar date instead of UTC serialization', () => {
    const lateNightLocal = new Date(2026, 11, 31, 23, 59, 59);

    expect(getLocalDateString(lateNightLocal)).toBe('2026-12-31');
  });
});
