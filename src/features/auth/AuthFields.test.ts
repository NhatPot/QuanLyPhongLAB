import { describe, it, expect } from 'vitest';
import { safeAuthRedirect } from './AuthFields';
describe('auth return URL', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/api/auth/logout', '/\nevil.test', null])('rejects unsafe redirect %s', value => expect(safeAuthRedirect(value)).toBe('/'));
  it('preserves an internal destination', () => expect(safeAuthRedirect('/calendar?view=week')).toBe('/calendar?view=week'));
});
