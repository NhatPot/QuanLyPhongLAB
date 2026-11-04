import {describe,it,expect,vi} from 'vitest';
import {FitSsoAuth} from './FitSsoAuth';
import {MemoryStore} from './MemoryAuthStore.test-support';
import type {SsoAuthorization,SsoIdentity} from '../../ports/IFitSsoProvider';
import type {AuthAccount} from '../../ports/ISelfServiceAuthStore';
import {requiresAccountSetup} from './account-setup-state';
import {createHmac} from 'node:crypto';
const issuer='https://auth.fitlhu.com',ctx={binding:'b'.repeat(64),ip:'test'},origin='http://localhost:3000';
function setup(){
 const store=new MemoryStore();let clock=Date.now();let flow:SsoAuthorization;
 const identity:SsoIdentity={issuer,subject:'sso-subject',email:'22600001@lachong.edu.vn',emailVerified:true,name:'Sinh viên',idToken:'test-id-token',expiresAt:new Date(clock+600000).toISOString()};
 const provider={authorizationUrl:vi.fn(async(input:SsoAuthorization)=>{flow=input;return issuer+'/authorize';}),exchange:vi.fn(async()=>identity),logoutUrl:vi.fn(async()=>issuer+'/logout')};
 const hasher={hash:vi.fn(async(p:string)=>'hash:'+p),compare:vi.fn(async(p:string,h:string)=>h==='hash:'+p)};
 const google={verify:vi.fn()};
 const service=new FitSsoAuth({enabled:true,issuer,clientId:'test-client',clientSecret:'test-secret',flowKey:'a'.repeat(64),allowedOrigins:[origin,'https://lab.fitlhu.com']},store,provider,hasher,google,{studentDomains:['lachong.edu.vn'],teacherDomains:['lhu.edu.vn']},'s'.repeat(48),()=>new Date(clock));
 const account=(changes:Partial<AuthAccount>={})=>{const a:AuthAccount={id:'11111111-1111-4111-8111-111111111111',email:identity.email,username:'legacy-name',fullName:'Tên cũ',passwordHash:'hash:old-password',status:'ACTIVE',deletedAt:null,emailVerifiedAt:null,...changes};store.state.accounts.set(a.id,a);store.state.roles.set(a.id,'TEACHER');return a;};
 const begin=async()=>{const start=await service.start(origin,'/bookings',ctx);return {start,url:new URL(origin+'/api/auth/sso/callback?code=synthetic&state='+flow.state+'&iss='+issuer),flow};};
 return {service,store,identity,provider,hasher,google,account,begin,advance:(ms:number)=>clock+=ms};
}
describe('FIT LHU SSO account boundary',()=>{
 it('creates a student with no local password, requires only profile, and never assigns provider roles',async()=>{
  const s=setup(),f=await s.begin();const result=await s.service.callback(f.url,f.start.flowId,ctx);
  expect(result.state).toBe('active');if(result.state==='link_required')throw new Error();
  const a=await s.store.accountById(result.userId);expect(a).toMatchObject({ssoLinked:true,passwordHash:null,username:s.identity.email});
  expect(s.store.state.roles.get(result.userId)).toBe('STUDENT');expect(requiresAccountSetup({...a!,department:undefined,phone:undefined})).toBe(true);
  await s.service.completeProfile({fullName:'Sinh viên',department:'CNTT',phone:'0901234567'},{...ctx,actorId:result.userId});
  const completed=await s.store.accountById(result.userId);expect(completed?.passwordHash).toBeNull();expect(requiresAccountSetup({...completed!,department:completed?.department||undefined,phone:completed?.phone||undefined})).toBe(false);expect(s.hasher.hash).not.toHaveBeenCalled();
  await expect(s.service.callback(f.url,f.start.flowId,ctx)).rejects.toMatchObject({code:'SSO_FLOW_INVALID'});
 });
 it.each(['state','browser','expired','origin'])('rejects %s before exchanging a code',async kind=>{
  const s=setup(),f=await s.begin();let context=ctx;
  if(kind==='state')f.url.searchParams.set('state','wrong');if(kind==='browser')context={...ctx,binding:'c'.repeat(64)};if(kind==='expired')s.advance(600001);if(kind==='origin')f.url=new URL(f.url.href.replace(origin,'https://attacker.invalid'));
  await expect(s.service.callback(f.url,f.start.flowId,context)).rejects.toBeTruthy();expect(s.provider.exchange).not.toHaveBeenCalled();expect(s.store.state.accounts.size).toBe(0);
 });
 it('never auto-links an existing email, preserves userId/password/role and consumes local proof once',async()=>{
  const s=setup(),old=s.account(),f=await s.begin(),r=await s.service.callback(f.url,f.start.flowId,ctx);expect(r.state).toBe('link_required');if(r.state!=='link_required')throw new Error();
  expect(s.store.state.ssoIdentities.size).toBe(0);await expect(s.service.link(r.pendingId,{password:'wrong'},ctx)).rejects.toMatchObject({code:'SSO_LINK_PROOF_INVALID'});
  const linked=await s.service.link(r.pendingId,{password:'old-password'},ctx);expect(linked).toMatchObject({state:'active',userId:old.id});expect(s.store.state.accounts.size).toBe(1);expect(s.store.state.roles.get(old.id)).toBe('TEACHER');expect((await s.store.accountById(old.id))?.passwordHash).toBe('hash:old-password');
  await expect(s.service.link(r.pendingId,{password:'old-password'},ctx)).rejects.toMatchObject({code:'SSO_FLOW_INVALID'});
 });
 it('keeps teacher approval separate from SSO identity',async()=>{
  const s=setup();s.identity.email='teacher@lhu.edu.vn';const f=await s.begin(),r=await s.service.callback(f.url,f.start.flowId,ctx);expect(r.state).toBe('pending_review');expect(s.store.state.roles.size).toBe(0);
  const a=[...s.store.state.accounts.values()][0];await expect(s.service.completeProfile({fullName:'Giảng viên',department:'CNTT',phone:'0901234567'},{...ctx,actorId:a.id})).rejects.toBeTruthy();
  await s.store.decideReview(a.id,true,'admin','');const again=await s.begin();expect(await s.service.callback(again.url,again.start.flowId,ctx)).toMatchObject({state:'active',userId:a.id});expect((await s.store.accountById(a.id))?.passwordHash).toBeNull();
 });
 it.each([{status:'LOCKED'},{deletedAt:new Date()},{status:'INACTIVE',registrationStatus:'REJECTED'}])('does not resurrect unavailable accounts: %j',async changes=>{
  const s=setup();s.account(changes);const f=await s.begin();await expect(s.service.callback(f.url,f.start.flowId,ctx)).rejects.toBeTruthy();expect(s.store.state.ssoIdentities.size).toBe(0);
 });
 it.each([{emailVerified:false},{issuer:'https://attacker.invalid'},{expiresAt:'invalid'},{expiresAt:'2000-01-01T00:00:00Z'}])('rejects invalid provider identity: %j',async changes=>{
  const s=setup();Object.assign(s.identity,changes);const f=await s.begin();await expect(s.service.callback(f.url,f.start.flowId,ctx)).rejects.toBeTruthy();expect(s.store.state.accounts.size).toBe(0);
 });
 it('caps password proof failures across fresh pending challenges and rolls back link on audit failure',async()=>{
  const s=setup(),old=s.account(),f=await s.begin(),r=await s.service.callback(f.url,f.start.flowId,ctx);if(r.state!=='link_required')throw new Error();
  vi.spyOn(s.store,'audit').mockRejectedValueOnce(new Error('Synthetic audit failure'));
  await expect(s.service.link(r.pendingId,{password:'old-password'},ctx)).rejects.toThrow();expect((await s.store.accountById(old.id))?.ssoLinked).toBeUndefined();
  for(let n=0;n<5;n++)await expect(s.service.link(r.pendingId,{password:'wrong'},ctx)).rejects.toMatchObject({code:'SSO_LINK_PROOF_INVALID'});
  const next=await s.begin(),pending=await s.service.callback(next.url,next.start.flowId,ctx);if(pending.state!=='link_required')throw new Error();
  await expect(s.service.link(pending.pendingId,{password:'old-password'},ctx)).rejects.toMatchObject({statusCode:429});
 });
 it('rejects blank phone and stores encrypted session material only on the server',async()=>{
  const s=setup(),old=s.account({ssoLinked:true,passwordHash:null});await expect(s.service.completeProfile({fullName:'Sinh viên',department:'CNTT',phone:'   '},{...ctx,actorId:old.id})).rejects.toMatchObject({statusCode:400});
  await s.service.saveSession('test-session',old.id,s.identity,'/bookings',new Date(Date.now()+300000));const saved=await s.store.challenge('test-session');expect(saved?.encryptedPayload).not.toContain('test-id-token');expect(await s.service.session('test-session')).toMatchObject({idToken:'test-id-token',returnTo:'/bookings'});
 });
 it('rejects an unregistered origin and removes open-redirect return targets',async()=>{
  const s=setup();await expect(s.service.start('https://attacker.invalid','/',ctx)).rejects.toMatchObject({code:'SSO_ORIGIN_INVALID'});expect(s.provider.authorizationUrl).not.toHaveBeenCalled();
  const f=await s.service.start(origin,'//attacker.invalid',ctx);expect(f.flowId).toBeTruthy();
 });
 it('consumes an authorization callback once under concurrent requests',async()=>{
  const s=setup(), f=await s.begin();const results=await Promise.allSettled([s.service.callback(f.url,f.start.flowId,ctx),s.service.callback(f.url,f.start.flowId,ctx)]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(s.provider.exchange).toHaveBeenCalledTimes(1);expect(s.store.state.accounts.size).toBe(1);
 });
 it('consumes a cancelled authorization without exchanging a code',async()=>{
  const s=setup(),f=await s.begin();f.url.searchParams.set('error','access_denied');await expect(s.service.callback(f.url,f.start.flowId,ctx)).rejects.toMatchObject({code:'SSO_CANCELLED'});expect(s.provider.exchange).not.toHaveBeenCalled();f.url.searchParams.delete('error');await expect(s.service.callback(f.url,f.start.flowId,ctx)).rejects.toMatchObject({code:'SSO_FLOW_INVALID'});
 });
 it.each([true,false])('links Google-only legacy accounts only with their already linked subject: %s',async valid=>{
  const s=setup(),old=s.account({passwordHash:null});await s.store.linkGoogle(old.id,'legacy-google',old.email);
  const f=await s.begin(),r=await s.service.callback(f.url,f.start.flowId,ctx);if(r.state!=='link_required')throw new Error();
  const hash=(v:string)=>createHmac('sha256','s'.repeat(48)).update(v).digest('hex'),gid='22222222-2222-4222-8222-222222222222';
  await s.store.saveChallenge({id:gid,email:'',purpose:'GOOGLE',binding:hash(ctx.binding),codeHash:hash('google-nonce'),eligible:true,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300000).toISOString()});
  s.google.verify.mockResolvedValue({sub:valid?'legacy-google':'different-google',email:old.email,name:'Student',nonce:'google-nonce'});
  const link=s.service.link(r.pendingId,{googleCredential:'synthetic-google-token',googleChallengeId:gid},ctx);
  if(valid){expect(await link).toMatchObject({state:'active',userId:old.id});expect((await s.store.accountById(old.id))?.passwordHash).toBeNull();}
  else {await expect(link).rejects.toMatchObject({code:'SSO_LINK_PROOF_INVALID'});expect(s.store.state.ssoIdentities.size).toBe(0);}
  expect((await s.store.challenge(gid))?.consumedAt).toBeTruthy();
 });
 it('keeps local administrator access independent of SSO profile completion',()=>{
  const user={ssoLinked:true,passwordHash:'local-admin-hash',fullName:'Admin'};
  expect(requiresAccountSetup(user,{usesSso:false,roles:['ADMIN']})).toBe(false);
  expect(requiresAccountSetup(user,{usesSso:true,roles:['ADMIN']})).toBe(true);
 });
 it('makes the logout hop single-use and browser-bound without exposing the ID token',async()=>{
  const s=setup(),old=s.account();s.provider.logoutUrl.mockResolvedValue(issuer+'/logout?id_token_hint=provider-token');
  await s.service.saveSession(old.id,old.id,s.identity,'/',new Date(Date.now()+300000));const id=await s.service.prepareLogout(old.id,origin,ctx);expect(id).toBeTruthy();expect((await s.store.challenge(id!))?.encryptedPayload).not.toContain('provider-token');
  await expect(s.service.finishLogout(id!,{...ctx,binding:'c'.repeat(64)})).rejects.toMatchObject({code:'SSO_FLOW_INVALID'});
  expect(await s.service.finishLogout(id!,ctx)).toBe(issuer+'/logout?id_token_hint=provider-token');await expect(s.service.finishLogout(id!,ctx)).rejects.toMatchObject({code:'SSO_FLOW_INVALID'});
 });
});
