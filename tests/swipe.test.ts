import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearNativeTextSelection,
  getSwipeLockGraceUntil,
  isSwipeDisabledTarget,
  shouldBlockSwipeInteraction,
  SWIPE_LOCK_GRACE_MS,
} from '../utils/swipe';

class FakeElement extends EventTarget {
  constructor(private readonly closestResult: FakeElement | null) {
    super();
  }

  closest() {
    return this.closestResult;
  }
}

describe('swipe interaction guards', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks swipe gestures that start from editable or explicitly disabled targets', () => {
    vi.stubGlobal('Element', FakeElement);
    const disabled = new FakeElement(null);
    const disabledChild = new FakeElement(disabled);
    const button = new FakeElement(null);

    expect(isSwipeDisabledTarget(disabledChild)).toBe(true);
    expect(isSwipeDisabledTarget(button)).toBe(false);
  });

  it('keeps swipe blocked briefly after an editable interaction ends', () => {
    const now = 1_000;
    const lockedUntil = getSwipeLockGraceUntil(now);

    expect(lockedUntil).toBe(now + SWIPE_LOCK_GRACE_MS);
    expect(shouldBlockSwipeInteraction(null, false, lockedUntil, now + SWIPE_LOCK_GRACE_MS - 1)).toBe(true);
    expect(shouldBlockSwipeInteraction(null, false, lockedUntil, now + SWIPE_LOCK_GRACE_MS)).toBe(false);
  });

  it('blocks context-menu follow-up events while swipe is explicitly suspended', () => {
    expect(shouldBlockSwipeInteraction(null, true, 0, 10_000)).toBe(true);
  });

  it('allows page swipes away from editable controls when the temporary lock has expired', () => {
    expect(shouldBlockSwipeInteraction(null, false, 10_000, 10_000)).toBe(false);
  });

  it('clears native text selection and input focus before page navigation', () => {
    const removeAllRanges = vi.fn();
    const blur = vi.fn();
    const setSelectionRange = vi.fn();
    const activeElement = {
      value: 'https://example.com/image.png',
      setSelectionRange,
      blur,
    };

    clearNativeTextSelection({
      activeElement,
      getSelection: () => ({ removeAllRanges }),
    });

    expect(removeAllRanges).toHaveBeenCalledOnce();
    expect(setSelectionRange).toHaveBeenCalledWith(activeElement.value.length, activeElement.value.length);
    expect(blur).toHaveBeenCalledOnce();
  });
});
