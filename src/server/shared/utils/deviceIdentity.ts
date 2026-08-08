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

  const hexOnly = trimmed.replace(/[:-]|\./g, '').toUpperCase();
  const pairs = hexOnly.match(/.{1,2}/g);
  return pairs ? pairs.join(':') : hexOnly;
}

export function safeJoinIps(ipArray: any[] | undefined | null, maxLength = 50): string | undefined {
  if (!Array.isArray(ipArray) || ipArray.length === 0) return undefined;
  
  const validIps = ipArray.map(ip => String(ip).trim()).filter(ip => ip.length > 0);
  if (validIps.length === 0) return undefined;

  let result = '';
  for (const ip of validIps) {
    if (result.length === 0) {
      result = ip;
    } else if (result.length + ip.length + 2 <= maxLength) {
      result += ', ' + ip;
    } else {
      break;
    }
  }
  return result;
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
