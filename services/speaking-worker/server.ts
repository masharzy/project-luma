import {createServer} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {db} from '../../src/lib/auth/db';
import {processSpeaking,failSpeaking} from '../../src/lib/products/speaking-worker';
const secret=process.env.SPEAKING_WORKER_TOKEN||'';
for(const name of ['DATABASE_URL','SPEAKING_APP_URL'])if(!process.env[name])throw Error('Missing worker environment: '+name);
if(secret.length<32)throw Error('SPEAKING_WORKER_TOKEN must be at least 32 characters');
const digest=(s:string)=>createHash('sha256').update(s).digest();
let stopping=false,ready=false,active:string|null=null;
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
// One paid request at a time. Database claims protect against duplicate deliveries/processes.
async function loop(){
 while(!stopping){
  try{
   const stale=await db().query("SELECT id FROM public.speaking_evaluations WHERE status='running' AND lease_until<now() ORDER BY created_at LIMIT 5");
   for(const row of stale)await failSpeaking(String(row.id),'WORKER_INTERRUPTED');
   const jobs=await db().query("SELECT id FROM public.speaking_evaluations WHERE status='pending' AND tries<1 ORDER BY created_at LIMIT 1");
   if(!jobs.length){await pause(5000);continue;}
   active=String(jobs[0].id);const id=active;
   const heartbeat=setInterval(()=>{void db().query("UPDATE public.speaking_evaluations SET lease_until=now()+interval '360 seconds' WHERE id=$1 AND status='running'",[id]).catch(()=>console.warn('Speaking heartbeat failed'));},30000);
   try{
    const contextResponse=await fetch(new URL('/api/internal/speaking-worker/context',process.env.SPEAKING_APP_URL),{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({id}),redirect:'error'});
    if(!contextResponse.ok)throw Error('Worker context unavailable');
    const context=await contextResponse.json() as {providerKey:string;audioUrls:Record<string,string>};
    if(!context.providerKey||!context.audioUrls)throw Error('Invalid worker context');
    await processSpeaking(id,{providerKey:context.providerKey,loadAudio:async key=>{
     const value=context.audioUrls[key];if(!value||new URL(value).protocol!=='https:')throw Error('Audio URL unavailable');
     const audio=await fetch(value,{redirect:'error'});if(!audio.ok)throw Error('Audio download failed');return new Uint8Array(await audio.arrayBuffer());
    }});
   }finally{clearInterval(heartbeat);active=null;}
  }catch{console.error('Speaking worker iteration failed');await pause(5000);}
 }
}
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET'&&req.url==='/health'){res.writeHead(ready&&!stopping?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:ready&&!stopping,busy:!!active}));return;}
 if(req.method!=='POST'||req.url!=='/jobs'){res.writeHead(404);res.end();return;}
 const token=req.headers.authorization?.replace(/^Bearer /,'')||'';
 if(!timingSafeEqual(digest(token),digest(secret))){res.writeHead(401);res.end();return;}
 if(!ready||stopping){res.writeHead(503);res.end();return;}
 let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>1024){res.writeHead(413);res.end();return;}}
 let id;try{id=JSON.parse(body).id;}catch{}
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)){res.writeHead(400);res.end();return;}
 // The job input is read only from Neon, never from the HTTP caller.
 res.writeHead(202,{'Content-Type':'application/json'});res.end('{"accepted":true}');
});
server.listen(Number(process.env.PORT||10000),'0.0.0.0',async()=>{try{await db().query('SELECT 1');ready=true;console.log('Speaking worker ready');void loop();}catch{console.error('Speaking database unavailable');process.exitCode=1;server.close();}});
process.on('SIGTERM',()=>{stopping=true;server.close();if(!active)process.exit(0);});
