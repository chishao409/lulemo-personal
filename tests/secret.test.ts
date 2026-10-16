import { describe, expect, it } from 'vitest';

import { hashSecret, isLegacyPlainSecret, verifySecret } from '../utils/secret';

describe('secret hashing', () => {
  it('marks raw strings as legacy secrets', () => {
    expect(isLegacyPlainSecret('1234')).toBe(true);
    expect(isLegacyPlainSecret(null)).toBe(false);
  });

  it('stores hashed secrets in the expected payload format', async () => {
    const hashed = await hashSecret('2580');
    const parsed = JSON.parse(hashed) as {
      v: number;
      algo: string;
      i: number;
      s: string;
      h: string;
    };

    expect(parsed.v).toBe(1);
    expect(parsed.algo).toBe('PBKDF2-SHA256');
    expect(parsed.i).toBeGreaterThan(0);
    expect(parsed.s).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(parsed.h).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(isLegacyPlainSecret(hashed)).toBe(false);
  });

  it('verifies hashed and legacy plain-text secrets correctly', async () => {
    const hashed = await hashSecret('2580');

    await expect(verifySecret('2580', hashed)).resolves.toBe(true);
    await expect(verifySecret('2581', hashed)).resolves.toBe(false);
    await expect(verifySecret('2580', '2580')).resolves.toBe(true);
    await expect(verifySecret('2581', '2580')).resolves.toBe(false);
    await expect(verifySecret('2580', null)).resolves.toBe(false);
  });
});
