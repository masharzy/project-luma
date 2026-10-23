import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { emailReady } from '../src/lib/auth/config.ts';

test('Resend sends canonical auth links and sanitizes provider errors', async () => {
  const calls=[];
  const env={RESEND_API_KEY:'re_test_only',RESEND_FROM_EMAIL:'Luma <auth@example.test>'};
  const output=ts.transpileModule(readFileSync('src/lib/auth/mail.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  let fail=false;
  vm.runInNewContext(output,{exports,process:{env},AbortSignal,encodeURIComponent,
    require:(name)=>name==='./config'?{appOrigin:()=> 'https://app.example.test',emailReady:()=>!!env.RESEND_FROM_EMAIL}:name==='nodemailer'?{createTransport:()=>{throw Error('Unexpected SMTP fallback')}}:{},
    fetch:async(url,options)=>{calls.push({url,options});if(fail)throw Error('secret provider body');return {ok:true};},
  });
  for(const kind of ['verify_email','reset_password']) await exports.sendAuthMail('recipient@example.invalid','safe-token',kind);
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'https://api.resend.com/emails');
  const payload=JSON.parse(calls[0].options.body);
  assert.equal(payload.from,env.RESEND_FROM_EMAIL);
  assert.match(payload.text,/https:\/\/app.example.test\/auth\/verify-email\?token=safe-token/);
  assert.match(JSON.parse(calls[1].options.body).text,/\/auth\/reset-password/);
  assert.equal(calls[0].options.redirect,'error');
  fail=true;
  await assert.rejects(exports.sendAuthMail('recipient@example.invalid','safe-token','verify_email'),{message:'Email delivery failed.'});
  delete env.RESEND_FROM_EMAIL;
  await assert.rejects(exports.sendAuthMail('recipient@example.invalid','safe-token','verify_email'),{message:'Email delivery is not configured.'});
  assert.equal(calls.length,3);
});
test('partial Resend configuration cannot silently fall back to SMTP',()=>{
  const old={...process.env};
  try {
    process.env.RESEND_API_KEY='re_test_only';delete process.env.RESEND_FROM_EMAIL;
    process.env.SMTP_HOST='localhost';process.env.SMTP_PORT='2525';process.env.SMTP_FROM='auth@example.test';
    assert.equal(emailReady(),false);
    process.env.RESEND_FROM_EMAIL='auth@example.test';assert.equal(emailReady(),true);
  }finally{for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);}
});
