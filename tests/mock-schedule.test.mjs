import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const native=createRequire(import.meta.url);
function loader(mocks={}){const cache=new Map();return function load(file){if(cache.has(file))return cache.get(file);const m={exports:{}};const code=ts.transpileModule(readFileSync(new URL('../src/'+file+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(p=>p==='server-only'?{}:Object.hasOwn(mocks,p)?mocks[p]:p.startsWith('./')?load(file.slice(0,file.lastIndexOf('/')+1)+p.slice(2)):p.startsWith('@/')?load(p.slice(2)):native(p),m,m.exports);cache.set(file,m.exports);return m.exports;};}
const S=loader()('lib/exam/mock-schedule');
const MIN=60000,T=Date.UTC(2026,10,8,14,10,0); // 20:10 Bangladesh time
const snapshot=[['listening',30],['reading',60],['writing',60],['speaking',15]].map(([module,m])=>({module,document:{durationMinutes:m}}));
test('lobby stages follow the 10 min countdown, 3 min join window and shared load buffer, to the second',()=>{
 const end=S.mockEnd(snapshot,T);
 assert.equal(S.lobbyStage(T,end,T-10*MIN-1),'wait');
 assert.equal(S.lobbyStage(T,end,T-10*MIN),'countdown');
 assert.equal(S.lobbyStage(T,end,T-1),'countdown');
 assert.equal(S.lobbyStage(T,end,T),'join');
 assert.equal(S.lobbyStage(T,end,T+3*MIN-1),'join');
 assert.equal(S.lobbyStage(T,end,T+3*MIN),'loading');
 assert.equal(S.lobbyStage(T,end,S.examStart(T)),'live');
 assert.equal(S.lobbyStage(T,end,end),'ended');
});
test('modules run back to back with one minute between them, Speaking has its own 15 minutes',()=>{
 const x=S.examStart(T);
 assert.equal(x,T+3*MIN+15000);
 assert.equal(S.moduleStart(snapshot,T,0),x);
 assert.equal(S.moduleEnd(snapshot,T,0),x+30*MIN);
 assert.equal(S.moduleStart(snapshot,T,1),x+31*MIN);
 assert.equal(S.moduleStart(snapshot,T,2),x+92*MIN);
 assert.equal(S.moduleStart(snapshot,T,3),x+153*MIN);
 assert.equal(S.mockEnd(snapshot,T),x+168*MIN);
});
const HttpError=class extends Error{constructor(status,message){super(message);this.status=status;}};
function joinHarness(now,{attempt=null}={}){
 const realNow=Date.now;Date.now=()=>now;const inserted=[];
 const query=async(sql,args)=>{if(sql.includes('FROM public.mock_events e JOIN public.admin_content'))return [{id:'1',title:'M',starts_at:new Date(T).toISOString(),ends_at:new Date(S.mockEnd(snapshot,T)).toISOString(),results_published_at:null,snapshot}];if(sql.startsWith('SELECT attempt_id'))return [{attempt_id:attempt}];if(sql.startsWith('WITH registration')){inserted.push(args);return [{attempt_id:args[2]}];}throw Error('Unexpected SQL '+sql.slice(0,40));};
 const api=loader({'@/lib/auth/db':{db:()=>({query})},'@/lib/auth/http':{AuthHttpError:HttpError},'./attempts':{settleAttempt:async r=>r},'./mock-readiness':{mockPublicationReadiness:()=>({})}})('lib/exam/mock-events');
 return {api,inserted,restore:()=>{Date.now=realNow;}};
}
test('the server refuses Join before the door opens and after the 3 minute window, but lets a joined candidate back in',async()=>{
 let h=joinHarness(T-1);try{await assert.rejects(h.api.joinMock('1','u'),e=>e.status===409);}finally{h.restore();}
 h=joinHarness(T+3*MIN);try{await assert.rejects(h.api.joinMock('1','u'),e=>e.status===409&&/join window/i.test(e.message));assert.equal(h.inserted.length,0);}finally{h.restore();}
 h=joinHarness(T+3*MIN-1000);try{const id=await h.api.joinMock('1','u');assert.ok(id);assert.equal(h.inserted.length,1);assert.equal(h.inserted[0][5],new Date(S.moduleEnd(snapshot,T,0)).toISOString());}finally{h.restore();}
 h=joinHarness(T+60*MIN,{attempt:'existing'});try{assert.equal(await h.api.joinMock('1','u'),'existing');assert.equal(h.inserted.length,0);}finally{h.restore();}
});
test('a paper is released only shortly before its module starts, audio URLs earlier for preloading',()=>{
 const api=loader({'@/lib/auth/db':{db:()=>({})},'@/lib/auth/session':{readSession:async()=>null},'next/headers':{cookies:async()=>({get:()=>undefined})},'@/lib/auth/http':{AuthHttpError:HttpError},'@/lib/auth/crypto':{digest:()=>'',validToken:()=>false},'./store':{learnerDocument:d=>d},'./result':{gradeModule:()=>({})}})('lib/exam/attempts');
 const snap=[{module:'listening',document:{durationMinutes:30,parts:[{audio_url:'https://a/1.mp3'},{audio_url:'https://a/2.mp3'}],questions:[]}},{module:'reading',document:{durationMinutes:60,parts:[],questions:[]}}];
 const x=S.examStart(T),row=()=>({id:'a',kind:'mock',parent_id:'1',title:'M',snapshot:snap,current_index:0,scheduled_start:new Date(T).toISOString(),deadline:null,answers:{},results:[],locked_index:null});
 const realNow=Date.now;try{
  Date.now=()=>x-S.PRELOAD_LEAD_MS-1000;let p=api.publicAttempt(row());assert.equal(p.current,null);assert.deepEqual(p.upcoming,{module:'listening',audio:['https://a/1.mp3','https://a/2.mp3']});assert.equal(p.mock.moduleStart,x);
  Date.now=()=>x-S.PRELOAD_LEAD_MS+1000;p=api.publicAttempt(row());assert.equal(p.current.module,'listening');assert.equal(p.upcoming,null);
 }finally{Date.now=realNow;}
});
