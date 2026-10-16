import { describe, expect, it } from 'vitest';
import { getDetailPaneSurfaceClass, getDetailSheetSurfaceClass, getDetailViewportBaseClass } from '../utils/detailModalSurface';

describe('detail modal surface classes', () => {
  it('provides a solid isolated surface for list and add panes', () => {
    const className = getDetailPaneSurfaceClass();
    expect(className).toContain('bg-white');
    expect(className).toContain('dark:bg-slate-900');
    expect(className).toContain('isolate');
    expect(className).toContain('[background-clip:padding-box]');
  });

  it('keeps animated panes out of forced compositor layers', () => {
    const className = getDetailPaneSurfaceClass();
    expect(className).not.toContain('[contain:paint]');
    expect(className).not.toContain('[backface-visibility:hidden]');
    expect(className).not.toContain('[transform:translateZ(0)]');
    expect(className).not.toContain('[will-change:transform,opacity]');
  });

  it('stabilizes the sheet shell during height changes without altering timing', () => {
    const className = getDetailSheetSurfaceClass();
    expect(className).toContain('isolate');
    expect(className).toContain('bg-white');
    expect(className).toContain('dark:bg-slate-900');
    expect(className).toContain('[background-clip:padding-box]');
    expect(className).not.toContain('[contain:paint]');
    expect(className).not.toContain('[backface-visibility:hidden]');
    expect(className).not.toContain('[transform:translateZ(0)]');
    expect(className).not.toContain('[will-change:height,max-height]');
  });

  it('provides a dedicated viewport base surface behind animated panes', () => {
    const className = getDetailViewportBaseClass();
    expect(className).toContain('absolute');
    expect(className).toContain('inset-0');
    expect(className).toContain('bg-white');
    expect(className).toContain('dark:bg-slate-900');
    expect(className).toContain('pointer-events-none');
    expect(className).not.toContain('[transform:translateZ(0)]');
  });
});
