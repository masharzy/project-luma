import 'server-only';
import { S3Client,GetObjectCommand,PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export function storageConfigured(){return ['R2_ENDPOINT','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'].every(k=>Boolean(process.env[k]));}
function client(){if(!storageConfigured())throw Error('Private audio storage is not configured');const u=new URL(process.env.R2_ENDPOINT!);if(u.protocol!=='https:'||!u.hostname.endsWith('.r2.cloudflarestorage.com'))throw Error('Invalid storage endpoint');return new S3Client({region:'auto',endpoint:u.origin,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID!,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY!}});}
export async function putPrivate(key:string,data:Uint8Array,type:string){await client().send(new PutObjectCommand({Bucket:process.env.R2_BUCKET,Key:key,Body:data,ContentType:type}));}
export async function getPrivate(key:string){const r=await client().send(new GetObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}));if(!r.Body)throw Error('Audio unavailable');return r.Body.transformToByteArray();}
export async function signedAudio(key:string){return getSignedUrl(client(),new GetObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}),{expiresIn:900});}
