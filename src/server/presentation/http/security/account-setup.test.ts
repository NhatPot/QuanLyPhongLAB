import { describe, expect, it } from 'vitest';
import { assertAccountSetupAccess } from './account-setup';

describe('account setup API restriction', () => {
  it.each([['GET','/api/auth/me'],['POST','/api/auth/account-setup'],['POST','/api/auth/logout-all']])('allows %s %s for setup', (method,path) => {
    expect(()=>assertAccountSetupAccess({requiresAccountSetup:true},method,path)).not.toThrow();
  });
  it.each([['GET','/api/users'],['POST','/api/bookings'],['PUT','/api/auth/me'],['POST','/api/auth/change-password'],['POST','/api/auth/me/password/set'],['POST','/api/auth/me/email/change']])('rejects bypass via %s %s', (method,path) => {
    expect(()=>assertAccountSetupAccess({requiresAccountSetup:true},method,path)).toThrow('hoàn thiện hồ sơ');
  });
  it('leaves existing password accounts unchanged',()=>{
    expect(()=>assertAccountSetupAccess({requiresAccountSetup:false},'GET','/api/users')).not.toThrow();
  });
});
