import { describe, expect, it, vi } from 'vitest';
import { CreateUserUseCase } from './UserManagementUseCases';

function setup() {
  const repo={findExistingRoleCodes:vi.fn(async(roles:string[])=>roles),isEmailOrUsernameTaken:vi.fn(async()=>false),save:vi.fn(),replaceRoles:vi.fn()};
  const hasher={hash:vi.fn(async()=> 'synthetic-hash')};
  const uow={complete:async(fn:()=>Promise<unknown>)=>fn(),getTransaction:()=>undefined};
  const audit={save:vi.fn()};
  const useCase=new CreateUserUseCase(repo as any,hasher as any,uow as any,audit as any);
  const input={fullName:'Người dùng mới',email:'student@lachong.edu.vn',username:'arbitrary-name',roleCodes:['STUDENT'],temporaryPassword:'temporary',actorUserId:'admin'};
  return {repo,useCase,input};
}
describe('new school account login policy',()=>{
  it('uses normalized school email as username, ignoring an arbitrary supplied username',async()=>{
    const s=setup(),detail=await s.useCase.execute({...s.input,email:' Student@lachong.edu.vn '});
    expect(detail.user.username).toBe('student@lachong.edu.vn');
    expect(detail.user.email).toBe('student@lachong.edu.vn');
  });
  it.each(['outside@gmail.com','fake@lhu.edu.vn.attacker.test'])('rejects non-school email %s before saving',async email=>{
    const s=setup();await expect(s.useCase.execute({...s.input,email})).rejects.toThrow('email trường');expect(s.repo.save).not.toHaveBeenCalled();
  });
  it('keeps the admin username exception',async()=>{
    const s=setup(),detail=await s.useCase.execute({...s.input,email:'admin@example.test',roleCodes:['ADMIN'],username:'admin'});
    expect(detail.user.username).toBe('admin');
  });
});
