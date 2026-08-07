import { BookingPurposeGroup } from '../../../domain/entities/BookingPurposeGroup';

const PURPOSE_STOP_WORDS = new Set([
  'bai', 'cho', 'cua', 'cuu', 'de', 'hanh', 'hoc', 'lam', 'mon', 'nghien', 'on',
  'phuc', 'su', 'tap', 'thuc', 'viec', 'va', 'voi', 'dung', 'phong', 'lab',
]);

export function normalizePurposeTokens(value: string): string[] {
  const withoutDiacritics = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi');

  const tokens = withoutDiacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !PURPOSE_STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
}

export function normalizePurposeKey(value: string): string {
  const tokens = normalizePurposeTokens(value);
  const boundedTokens: string[] = [];
  let length = 0;
  for (const token of tokens.sort()) {
    const nextLength = length + token.length + (boundedTokens.length ? 1 : 0);
    if (nextLength > 255) break;
    boundedTokens.push(token);
    length = nextLength;
  }
  return boundedTokens.length > 0 ? boundedTokens.join(' ') : 'general';
}

export function purposeSimilarity(left: string, right: string): number {
  const leftTokens = new Set(normalizePurposeTokens(left));
  const rightTokens = new Set(normalizePurposeTokens(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  return intersection / Math.min(leftTokens.size, rightTokens.size);
}

export function findMatchingPurposeGroup(
  purpose: string,
  groups: BookingPurposeGroup[],
): BookingPurposeGroup | null {
  const normalizedKey = normalizePurposeKey(purpose);
  const exact = groups.find((group) => group.isActive && group.normalizedKey === normalizedKey);
  if (exact) return exact;

  return groups
    .filter((group) => group.isActive)
    .map((group) => ({ group, score: purposeSimilarity(purpose, group.normalizedKey) }))
    .filter((item) => item.score >= 0.8)
    .sort((left, right) => right.score - left.score)[0]?.group || null;
}

export function purposeGroupCode(normalizedKey: string): string {
  const slug = normalizedKey
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 38) || 'GENERAL';
  let hash = 0;
  for (const character of normalizedKey) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `PURPOSE-${slug}-${hash.toString(36).toUpperCase().padStart(4, '0').slice(-6)}`.slice(0, 50);
}
