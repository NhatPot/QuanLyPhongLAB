import '../src/server/config/load-environment';
import {readFitSsoConfig,assertFitSsoConfig,ssoOrigin} from '../src/server/infrastructure/auth/fit-sso-config';
import {SqlConnectionFactory} from '../src/server/infrastructure/database/sqlserver/connection';
async function run(){
 const config=readFitSsoConfig();assertFitSsoConfig(config);config.allowedOrigins.forEach(o=>ssoOrigin(config,o));
 const response=await fetch(config.issuer+'/.well-known/openid-configuration',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();const data=await response.json();
 if(data.issuer!==config.issuer||!data.code_challenge_methods_supported?.includes('S256')||!data.id_token_signing_alg_values_supported?.includes('RS256'))throw new Error();
 const report:Record<string,unknown>={enabled:true,issuer:config.issuer,clientConfigured:true,secretConfigured:!!config.clientSecret,flowKeyReady:true,discoveryReady:true,pkce:'S256',idTokenAlgorithm:'RS256',callbacks:config.allowedOrigins.map(o=>o+'/api/auth/sso/callback'),realUserLogin:'NOT_RUN'};
 if(process.argv.includes('--database')){const pool=await SqlConnectionFactory.getPool();const r=await pool.request().query("SELECT CASE WHEN OBJECT_ID('UserExternalIdentities') IS NOT NULL AND OBJECT_ID('AuthChallenges') IS NOT NULL AND OBJECT_ID('AuthSessions') IS NOT NULL AND OBJECT_ID('AccountRegistrations') IS NOT NULL THEN 1 ELSE 0 END AS schemaReady");report.schemaReady=r.recordset[0].schemaReady===1;if(!report.schemaReady)throw new Error();}
 console.log(JSON.stringify(report,null,2));
}
run().catch(()=>{console.error('SSO chưa sẵn sàng. Kiểm tra cấu hình server, kết nối discovery và schema 031.');process.exitCode=1;}).finally(()=>SqlConnectionFactory.close());
