const PBKDF2_ITERATIONS = 120_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

interface SecretV1 {
  v: 1;
  algo: 'PBKDF2-SHA256';
  i: number;
  s: string;
  h: string;
}

function textEncoder(): TextEncoder {
  return new TextEncoder();
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function randomSaltBase64(): string {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return toBase64(salt);
}

async function pbkdf2Hash(secret: string, saltBase64: string, iterations: number): Promise<string> {
  const secretBytes = textEncoder().encode(secret);
  const salt = fromBase64(saltBase64);
  const keyMaterial = await crypto.subtle.importKey('raw', secretBytes, 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return toBase64(new Uint8Array(derivedBits));
}

function parseStoredSecret(raw: string): SecretV1 | null {
  try {
    const obj = JSON.parse(raw) as SecretV1;
    if (
      obj &&
      obj.v === 1 &&
      obj.algo === 'PBKDF2-SHA256' &&
      typeof obj.i === 'number' &&
      typeof obj.s === 'string' &&
      typeof obj.h === 'string'
    ) {
      return obj;
    }
    return null;
  } catch {
    return null;
  }
}

export function isLegacyPlainSecret(raw: string | null): boolean {
  if (!raw) return false;
  return parseStoredSecret(raw) == null;
}

export async function hashSecret(secret: string): Promise<string> {
  const payload: SecretV1 = {
    v: 1,
    algo: 'PBKDF2-SHA256',
    i: PBKDF2_ITERATIONS,
    s: randomSaltBase64(),
    h: '',
  };
  payload.h = await pbkdf2Hash(secret, payload.s, payload.i);
  return JSON.stringify(payload);
}

export async function verifySecret(input: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parsed = parseStoredSecret(stored);
  if (!parsed) {
    return input === stored;
  }
  const inputHash = await pbkdf2Hash(input, parsed.s, parsed.i);
  return inputHash === parsed.h;
}
