import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('styles.css', 'utf8');

function getCssRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? '';
}

describe('detail modal animation styles', () => {
  it('does not force the detail sheet into a compositor layer', () => {
    expect(getCssRule('.detail-modal-sheet')).not.toContain('will-change');
    expect(getCssRule('.detail-modal-sheet-out')).not.toContain('will-change');
  });
});
