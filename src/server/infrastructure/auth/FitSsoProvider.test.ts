import {describe,it,expect} from 'vitest';
import {generateKeyPairSync} from 'node:crypto';
import jwt from 'jsonwebtoken';
import {FitSsoProvider} from './FitSsoProvider';
import type {CustomFetch} from 'openid-client';
const issuer='https://auth.fitlhu.com',clientId='test-client',keys=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...keys.publicKey.export({format:'jwk'}),kid:'sso-test-key',use:'sig',alg:'RS256'};
const flow={state:'test-state',nonce:'test-nonce',verifier:'v'.repeat(64),redirectUri:'http://localhost:3000/api/auth/sso/callback'};
function provider(changes:Record<string,unknown>={},wrongSignature=false){
 let tokenBody='',basic='';
 const fetcher:CustomFetch=async(input,init)=>{
  const url=new URL(String(input));let body:unknown;
  if(url.pathname.includes('openid-configuration'))body={issuer,authorization_endpoint:issuer+'/authorize',token_endpoint:issuer+'/token',jwks_uri:issuer+'/jwks',end_session_endpoint:issuer+'/logout',id_token_signing_alg_values_supported:['RS256'],response_types_supported:['code'],subject_types_supported:['public'],authorization_response_iss_parameter_supported:true};
  else if(url.pathname==='/jwks')body={keys:[jwk]};
  else if(url.pathname==='/token'){
   tokenBody=String(init?.body);basic=new Headers(init?.headers).get('authorization')||'';
   const key=wrongSignature?generateKeyPairSync('rsa',{modulusLength:2048}).privateKey:keys.privateKey;
   const claims={iss:issuer,aud:clientId,sub:'sso-user',exp:Math.floor(Date.now()/1000)+600,iat:Math.floor(Date.now()/1000),nonce:flow.nonce,email:'student@lachong.edu.vn',email_verified:true,name:'Sinh viên',...changes};
   body={access_token:'test-access',token_type:'Bearer',expires_in:600,id_token:jwt.sign(claims,key,{algorithm:'RS256',keyid:'sso-test-key'})};
  }else throw new Error('Unexpected provider request');
  return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
 };
 const instance=new FitSsoProvider({enabled:true,issuer,clientId,clientSecret:'test-secret',flowKey:'a'.repeat(64),allowedOrigins:['http://localhost:3000']},fetcher);
 return {instance,request:()=>({tokenBody,basic})};
}
const callback=()=>new URL(flow.redirectUri+'?code=test-code&state='+flow.state+'&iss='+issuer);
describe('FIT SSO real OIDC library verification',()=>{
 it('uses PKCE S256 and server Basic authentication and verifies a signed ID token',async()=>{
  const p=provider(),url=new URL(await p.instance.authorizationUrl(flow));expect(url.searchParams.get('code_challenge_method')).toBe('S256');expect(url.searchParams.get('scope')).toBe('openid profile email');
  expect(await p.instance.exchange(callback(),flow)).toMatchObject({issuer,subject:'sso-user',emailVerified:true});
  const r=p.request();expect(Buffer.from(r.basic.slice(6),'base64').toString().split(':').map(decodeURIComponent)).toEqual([clientId,'test-secret']);expect(new URLSearchParams(r.tokenBody).get('code_verifier')).toBe(flow.verifier);
 });
 it.each([{nonce:'wrong'},{aud:'other-client'},{iss:'https://other.invalid'},{exp:1},{email_verified:false}])('rejects %j',async changes=>{
  await expect(provider(changes).instance.exchange(callback(),flow)).rejects.toBeTruthy();
 });
 it('rejects forged signatures even when token endpoint TLS is trusted',async()=>{await expect(provider({},true).instance.exchange(callback(),flow)).rejects.toBeTruthy();});
 it('rejects wrong callback state and issuer',async()=>{const p=provider(),url=callback();url.searchParams.set('state','wrong');await expect(p.instance.exchange(url,flow)).rejects.toBeTruthy();url.searchParams.set('iss','https://attacker.invalid');await expect(p.instance.exchange(url,flow)).rejects.toBeTruthy();});
});
