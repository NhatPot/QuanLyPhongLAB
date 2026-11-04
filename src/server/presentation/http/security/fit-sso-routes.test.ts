import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const {service,container,issue}=vi.hoisted(()=>({
 service:{start:vi.fn(),callback:vi.fn(),pending:vi.fn(),link:vi.fn(),completeProfile:vi.fn(),saveSession:vi.fn(),session:vi.fn(),logout:vi.fn(),prepareLogout:vi.fn(),finishLogout:vi.fn()},
 container:{userRepo:{findById:vi.fn()},sessionRepo:{},rolePermQuery:{},tokenService:{},uow:{},auditLogRepo:{},logoutUseCase:{execute:vi.fn()},validateAccessSessionUseCase:{execute:vi.fn()}},issue:vi.fn(),
}));
vi.mock('../../../container/fit-sso-container',()=>({fitSsoAuth:()=>service}));
vi.mock('../../../container/dependency-container',()=>({container}));
vi.mock('../../../application/use-cases/auth/IssueSession',()=>({IssueSession:class{execute=issue;}}));
import {FitSsoController} from '../controllers/FitSsoController';
import {handleExpressRoute} from '../../../utils/route-helper';
import {createCsrfToken} from './web-session';
import {UnauthorizedError} from '../../../shared/errors/AppError';
const controller=new FitSsoController(),origin='http://localhost:3000',id='11111111-1111-4111-8111-111111111111';
function request(path:string,body?:object,cookies='',csrf?:string){return new NextRequest(origin+'/api/auth/sso/'+path,{method:body?'POST':'GET',headers:{cookie:cookies,...(body?{'Content-Type':'application/json',origin,...(csrf?{'x-csrf-token':csrf}:{})}:{})},...(body?{body:JSON.stringify(body)}:{})});}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('JWT_SECRET','sso-http-test-secret');vi.stubEnv('APP_ORIGIN',origin);vi.stubEnv('FIT_SSO_ALLOWED_ORIGINS',origin+',https://lab.fitlhu.com');
 container.userRepo.findById.mockResolvedValue({id,ssoLinked:true,status:'ACTIVE'});
 container.validateAccessSessionUseCase.execute.mockResolvedValue({userId:id,sessionId:id,roles:['STUDENT'],permissions:[],requiresAccountSetup:true,usesSso:true});
 service.saveSession.mockResolvedValue(undefined);service.session.mockResolvedValue({returnTo:'/bookings'});
 issue.mockResolvedValue({sessionId:id,accessToken:'local-access-secret',refreshToken:'local-refresh-secret',refreshExpiresAt:new Date(Date.now()+600000),requiresAccountSetup:true});
});
afterEach(()=>vi.unstubAllEnvs());
describe('SSO HTTP boundary',()=>{
 it('requires CSRF before creating an authorization flow',async()=>{
  const r=await handleExpressRoute(request('start',{}),undefined,controller.start,{requireAuth:false});expect(r.status).toBe(403);expect(service.start).not.toHaveBeenCalled();
 });
 it('returns only authorization URL with a bound HttpOnly flow cookie',async()=>{
  service.start.mockResolvedValue({flowId:id,authorizationUrl:'https://auth.fitlhu.com/authorize?state=test-state'});const csrf=createCsrfToken();
  const r=await handleExpressRoute(request('start',{returnTo:'/bookings'},'csrfToken='+csrf,csrf),undefined,controller.start,{requireAuth:false});
  expect(r.status).toBe(200);expect(r.headers.getSetCookie().find(c=>c.startsWith('fitSsoFlowId='))).toMatch(/HttpOnly/);expect(r.headers.get('cache-control')).toBe('no-store');expect(Object.keys((await r.json()).data)).toEqual(['authorizationUrl']);
 });
 it('redirects after valid callback without leaking provider or local tokens into URL/JSON',async()=>{
  const identity={issuer:'https://auth.fitlhu.com',subject:'subject',email:'student@lachong.edu.vn',emailVerified:true,name:'Student',idToken:'provider-id-token-secret',expiresAt:new Date(Date.now()+600000).toISOString()};
  service.callback.mockResolvedValue({state:'active',userId:id,identity,returnTo:'/bookings'});
  const r=await handleExpressRoute(request('callback?code=sensitive-code&state=sensitive-state&iss=https://auth.fitlhu.com',undefined,'fitSsoFlowId='+id+';authFlow='+'b'.repeat(64)),undefined,controller.callback,{requireAuth:false});
  expect(r.status).toBe(303);expect(r.headers.get('location')).toBe(origin+'/complete-account?from=%2Fbookings');const body=await r.text();for(const secret of ['provider-id-token-secret','local-access-secret','local-refresh-secret','sensitive-code']){expect(body).not.toContain(secret);expect(r.headers.get('location')).not.toContain(secret);}
  expect(r.headers.getSetCookie().find(c=>c.startsWith('accessToken='))).toMatch(/HttpOnly/);expect(service.saveSession).toHaveBeenCalledOnce();
  expect(issue.mock.calls[0][2]).toMatchObject({authenticationMethod:'SSO'});expect(issue.mock.calls[0][2].expiresAt.getTime()).toBeLessThanOrEqual(Date.now()+600000);
 });
 it('only offers local-account linking after verified SSO, without issuing a dashboard session',async()=>{
  service.callback.mockResolvedValue({state:'link_required',pendingId:id});const r=await handleExpressRoute(request('callback?code=code&state=state',undefined,'fitSsoFlowId='+id),undefined,controller.callback,{requireAuth:false});
  expect(r.status).toBe(303);expect(r.headers.get('location')).toBe(origin+'/sso-link');expect(issue).not.toHaveBeenCalled();expect(r.headers.getSetCookie().some(c=>c.startsWith('accessToken='))).toBe(false);expect(r.headers.getSetCookie().find(c=>c.startsWith('fitSsoPendingId='))).toMatch(/HttpOnly/);
 });
 it('redirects failed callback with a controlled code, never provider details',async()=>{
  service.callback.mockRejectedValue(new UnauthorizedError('Sensitive provider details','SSO_STATE_INVALID'));const r=await handleExpressRoute(request('callback?code=secret',undefined,'fitSsoFlowId='+id),undefined,controller.callback,{requireAuth:false});
  expect(r.status).toBe(303);expect(r.headers.get('location')).toBe(origin+'/login?sso_error=SSO_STATE_INVALID');expect(await r.text()).not.toContain('Sensitive');
 });
 it('allows only own SSO profile, strips role/email/password fields and requires phone',async()=>{
  const csrf=createCsrfToken(),cookie='csrfToken='+csrf+'; accessToken=test';service.completeProfile.mockResolvedValue({state:'profile_completed'});
  const body={fullName:'Student',department:'CNTT',phone:'0901234567'};
  const r=await handleExpressRoute(request('profile',{...body,userId:'forged',role:'ADMIN',email:'forged@example.com',password:'must-not-set'},cookie,csrf),undefined,controller.profile);
  expect(r.status).toBe(200);expect(service.completeProfile).toHaveBeenCalledWith(body,expect.objectContaining({actorId:id}));expect((await r.json()).data.redirectTo).toBe('/bookings');
  service.completeProfile.mockClear();const missing=await handleExpressRoute(request('profile',{...body,phone:''},cookie,csrf),undefined,controller.profile);expect(missing.status).toBe(400);expect(service.completeProfile).not.toHaveBeenCalled();
 });
 it('clears a previous Lab account when explicitly starting SSO',async()=>{
  const csrf=createCsrfToken('old-lab-session');service.start.mockResolvedValue({flowId:id,authorizationUrl:'https://auth.fitlhu.com/authorize'});
  const r=await handleExpressRoute(request('start',{},'csrfToken='+csrf+';refreshToken=old-lab-session',csrf),undefined,controller.start,{requireAuth:false});
  expect(r.status).toBe(200);expect(container.logoutUseCase.execute).toHaveBeenCalledWith({refreshToken:'old-lab-session'});expect(r.headers.getSetCookie().some(c=>c.startsWith('refreshToken=;'))).toBe(true);
 });
 it('returns only an internal logout hop, keeping provider ID token out of JSON',async()=>{
  const csrf=createCsrfToken();service.prepareLogout.mockResolvedValue(id);const r=await handleExpressRoute(request('logout',{},'csrfToken='+csrf+';accessToken=local',csrf),undefined,controller.logout);
  expect(r.status).toBe(200);expect((await r.json()).data.redirectTo).toBe('/api/auth/sso/logout-redirect');expect(r.headers.getSetCookie().find(c=>c.startsWith('fitSsoLogoutId='))).toMatch(/HttpOnly/);
 });
});
