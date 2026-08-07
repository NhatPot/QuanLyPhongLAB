import crypto from 'crypto';

const MAC_ADDRESS_PATTERN = /^(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}$|^(?:[0-9a-f]{4}\.){2}[0-9a-f]{4}$|^[0-9a-f]{12}$/i;

export function isValidMacAddress(value: string): boolean {
  return MAC_ADDRESS_PATTERN.test(value.trim());
}

export function normalizeMacAddress(value: string): string {
  const trimmed = value.trim();
  if (!isValidMacAddress(trimmed)) {
    throw new Error('Địa chỉ MAC không đúng định dạng.');
  }

  return trimmed.replace(/[:-]|\./g, '').toUpperCase();
}

export function normalizeDeviceId(value: string): string {
  const trimmed = value.trim();
  return isValidMacAddress(trimmed) ? normalizeMacAddress(trimmed) : trimmed;
}

export function generateDeviceApiKey(): string {
  return `sk_live_${crypto.randomBytes(32).toString('hex')}`;
}

export function hashDeviceApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex');
}
