import { describe, expect, it } from 'vitest';

import {
  buildBackgroundImageStyle,
  parseStoredBackgroundConfig,
  serializeBackgroundConfig,
} from '../utils/background';

describe('background helpers', () => {
  it('parses legacy string backgrounds into default configs', () => {
    expect(parseStoredBackgroundConfig('https://example.com/a.jpg')).toEqual({
      src: 'https://example.com/a.jpg',
      positionX: 50,
      positionY: 0,
      scale: 1,
    });
  });

  it('parses stored json configs and clamps values', () => {
    expect(parseStoredBackgroundConfig(JSON.stringify({
      src: 'https://example.com/a.jpg',
      positionX: 120,
      positionY: -20,
      scale: 5,
    }))).toEqual({
      src: 'https://example.com/a.jpg',
      positionX: 100,
      positionY: 0,
      scale: 2.4,
    });
  });

  it('serializes and exposes object-position and scale for rendering', () => {
    const raw = serializeBackgroundConfig({
      src: 'file://wallpaper',
      positionX: 42,
      positionY: 18,
      scale: 1.6,
    });

    expect(raw).toBe('{"src":"file://wallpaper","positionX":42,"positionY":18,"scale":1.6}');
    expect(buildBackgroundImageStyle({
      src: 'file://wallpaper',
      positionX: 42,
      positionY: 18,
      scale: 1.6,
    })).toMatchObject({
      objectPosition: '42% 18%',
      transform: 'scale(1.6)',
    });
  });
});
