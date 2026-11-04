import {createServer} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {db} from '../../src/lib/auth/db';
import {processSpeaking,failSpeaking} from '../../src/lib/products/speaking-worker';
const secret=process.env.SPEAKING_WORKER_TOKEN||'';
for(const name of ['DATABASE_URL','AI_LAB_MASTER_KEY','R2_ENDPOINT','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'])if(!process.env[name])throw Error('Missing worker environment: '+name);
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
   try{await processSpeaking(id);}finally{clearInterval(heartbeat);active=null;}
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
