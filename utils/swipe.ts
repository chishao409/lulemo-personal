export const SWIPE_LOCK_GRACE_MS = 700;

export function isSwipeDisabledTarget(target: EventTarget | null): boolean {
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    Boolean(target.closest('input, textarea, select, [contenteditable], [data-disable-swipe="true"]'))
  );
}

export function shouldBlockSwipeInteraction(
  target: EventTarget | null,
  isSwipeSuspended: boolean,
  lockedUntilMs: number,
  nowMs: number
): boolean {
  return isSwipeSuspended || nowMs < lockedUntilMs || isSwipeDisabledTarget(target);
}

export function getSwipeLockGraceUntil(nowMs: number, graceMs = SWIPE_LOCK_GRACE_MS): number {
  return nowMs + graceMs;
}

interface NativeSelectionLike {
  removeAllRanges?: () => void;
}

interface NativeTextSelectionDocumentLike {
  activeElement?: unknown;
  getSelection?: () => NativeSelectionLike | null;
}

interface SelectableActiveElementLike {
  value?: unknown;
  setSelectionRange?: (selectionStart: number, selectionEnd: number) => void;
  blur?: () => void;
}

export function clearNativeTextSelection(
  doc: NativeTextSelectionDocumentLike | null = typeof document !== 'undefined' ? document : null
): void {
  if (!doc) return;

  const selection = typeof doc.getSelection === 'function' ? doc.getSelection() : null;
  if (selection && typeof selection.removeAllRanges === 'function') {
    selection.removeAllRanges();
  }

  const activeElement = doc.activeElement as SelectableActiveElementLike | undefined;
  if (!activeElement) return;

  if (typeof activeElement.value === 'string' && typeof activeElement.setSelectionRange === 'function') {
    const end = activeElement.value.length;
    try {
      activeElement.setSelectionRange(end, end);
    } catch {
      // Some input types do not support selection ranges.
    }
  }

  if (typeof activeElement.blur === 'function') {
    activeElement.blur();
  }
}
