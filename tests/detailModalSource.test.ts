import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const detailModalSource = readFileSync('components/DetailModal.tsx', 'utf8');

describe('detail modal internal surfaces', () => {
  it('keeps sheet chrome opaque so transitions cannot reveal the backdrop', () => {
    expect(detailModalSource).not.toContain('backdrop-blur-xl');
    expect(detailModalSource).not.toContain('backdrop-blur-2xl');
    expect(detailModalSource).not.toContain('bg-white/82');
    expect(detailModalSource).not.toContain('bg-white/96');
    expect(detailModalSource).not.toContain('via-white/72');
  });

  it('keeps bottom action buttons free of rasterized shadows during pane transitions', () => {
    expect(detailModalSource).not.toContain('bg-yellow-400 py-4 font-bold text-yellow-900 shadow-md transition-all');
    expect(detailModalSource).not.toContain(
      'bg-green-500 py-4 font-bold text-white shadow-lg shadow-green-500/20 transition-all',
    );
  });

  it('keeps delete-confirm surfaces opaque and shadow-free before closing the sheet', () => {
    expect(detailModalSource).not.toContain('bg-red-50/90 shadow-[0_8px_24px_rgba(239,68,68,0.12)]');
    expect(detailModalSource).not.toContain('dark:bg-red-950/20');
    expect(detailModalSource).not.toContain('bg-red-500 text-white shadow-lg shadow-red-500/25');
  });

  it('keeps the closing sheet shell free of large rasterized shadows', () => {
    expect(detailModalSource).not.toContain('bg-white shadow-2xl transition-[height,max-height]');
  });
});
