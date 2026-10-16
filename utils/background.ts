import { CSSProperties } from 'react';

import { CustomBackgroundConfig } from '../types';

export const DEFAULT_BACKGROUND_POSITION_X = 50;
export const DEFAULT_BACKGROUND_POSITION_Y = 0;
export const DEFAULT_BACKGROUND_SCALE = 1;
export const MIN_BACKGROUND_SCALE = 1;
export const MAX_BACKGROUND_SCALE = 2.4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeBackgroundConfig(
  config: Pick<CustomBackgroundConfig, 'src'> & Partial<Omit<CustomBackgroundConfig, 'src'>>
): CustomBackgroundConfig {
  return {
    src: config.src,
    positionX: clamp(config.positionX ?? DEFAULT_BACKGROUND_POSITION_X, 0, 100),
    positionY: clamp(config.positionY ?? DEFAULT_BACKGROUND_POSITION_Y, 0, 100),
    scale: clamp(config.scale ?? DEFAULT_BACKGROUND_SCALE, MIN_BACKGROUND_SCALE, MAX_BACKGROUND_SCALE),
  };
}

export function parseStoredBackgroundConfig(raw: string | null): CustomBackgroundConfig | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CustomBackgroundConfig> | string;
    if (typeof parsed === 'string') {
      return normalizeBackgroundConfig({ src: parsed });
    }
    if (parsed && typeof parsed.src === 'string') {
      return normalizeBackgroundConfig({ src: parsed.src, positionX: parsed.positionX, positionY: parsed.positionY, scale: parsed.scale });
    }
  } catch {
    return normalizeBackgroundConfig({ src: raw });
  }

  return null;
}

export function serializeBackgroundConfig(config: CustomBackgroundConfig | null): string | null {
  if (!config) return null;
  return JSON.stringify(normalizeBackgroundConfig(config));
}

export function buildBackgroundImageStyle(config: CustomBackgroundConfig): CSSProperties {
  const normalized = normalizeBackgroundConfig(config);
  return {
    objectPosition: `${normalized.positionX}% ${normalized.positionY}%`,
    transform: `scale(${normalized.scale})`,
    transformOrigin: 'center center',
    willChange: 'transform',
  };
}
