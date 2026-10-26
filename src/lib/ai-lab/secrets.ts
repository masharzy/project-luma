import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { db } from '@/lib/auth/db';
export type Provider = 'google' | 'openrouter';
export function vaultReady(){return /^[a-f0-9]{64}$/i.test(process.env.AI_LAB_MASTER_KEY || '');}
function master(){if(!vaultReady())throw Error('AI lab encryption is not configured');return Buffer.from(process.env.AI_LAB_MASTER_KEY!, 'hex');}
export async function saveKey(provider:Provider,value:string){
 const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',master(),iv);cipher.setAAD(Buffer.from(provider));
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 const packed=[iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('base64')).join('.');
 await db().query('INSERT INTO public.ai_lab_secrets(provider,encrypted_key) VALUES($1,$2) ON CONFLICT(provider) DO UPDATE SET encrypted_key=excluded.encrypted_key,updated_at=now()',[provider,packed]);
}
export async function getKey(provider:Provider){
 const rows=await db().query('SELECT encrypted_key FROM public.ai_lab_secrets WHERE provider=$1',[provider]);
 if(!rows.length){const value=process.env[provider==='google'?'GEMINI_API_KEY':'OPENROUTER_API_KEY'];if(!value)throw Error('Provider key is not configured');return value;}
 const [iv,tag,data]=(rows[0].encrypted_key as string).split('.').map(x=>Buffer.from(x,'base64'));
 const cipher=createDecipheriv('aes-256-gcm',master(),iv);cipher.setAAD(Buffer.from(provider));cipher.setAuthTag(tag);
 return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8');
}
export async function keyStatus(){const rows=await db().query('SELECT provider FROM public.ai_lab_secrets');return {google:Boolean(process.env.GEMINI_API_KEY)||rows.some(r=>r.provider==='google'),openrouter:Boolean(process.env.OPENROUTER_API_KEY)||rows.some(r=>r.provider==='openrouter'),vaultReady:vaultReady()};}
