import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=ts.transpileModule(readFileSync(new URL('../src/lib/ai-lab/benchmark.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function('require','module','exports',source)(name=>name==='server-only'?{}:name==='./secrets'?{getKey:async()=> 'private-test-key'}:require(name),mod,mod.exports);
const {inputSchema,validateAssessment,runBenchmark}=mod.exports;
const input={provider:'google',model:'test-model',skill:'writing',level:'normal',reasoning:'none',maxThinking:8192,question:'Discuss this opinion.',answer:'This is a valid answer.',sampleId:'test-1',referenceBand:6};
const result={scorable:true,limitation:'',criteria:['task','coherence','vocabulary','grammar'].map(name=>({name,band:6,evidence:[{quote:'valid answer',timestampSeconds:null,reason:'Evidence'}],feedback:'Feedback'})),nextSteps:[]};
test('Speaking requires original audio; provider settings are validated',()=>{
 assert.equal(inputSchema.safeParse({...input,skill:'speaking'}).success,false);
 assert.equal(inputSchema.safeParse({...input,provider:'openrouter',reasoning:'budget'}).success,false);
 assert.equal(inputSchema.safeParse(input).success,true);
});
test('Bands are calculated and fabricated quotes rejected',()=>{
 const value=validateAssessment(JSON.stringify(result),input);assert.equal(value.estimatedBand,6);assert.equal(value.absoluteBandError,0);
 assert.throws(()=>validateAssessment(JSON.stringify({...result,criteria:result.criteria.map(c=>({...c,evidence:[{quote:'invented',timestampSeconds:null,reason:'bad'}]}))}),input));
});
test('Speaking scoring requires timestamped evidence for each criterion',()=>{
 const speaking={...input,skill:'speaking'};
 const criteria=['fluency','vocabulary','grammar','pronunciation'].map(name=>({...result.criteria[0],name}));
 assert.throws(()=>validateAssessment(JSON.stringify({...result,criteria}),speaking));
});
test('Streaming measures text separately from keepalive and reports provider failures',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(new ReadableStream({start(controller){
   controller.enqueue(new TextEncoder().encode(': keepalive\n\ndata: '+JSON.stringify({candidates:[{content:{parts:[{thought:true,text:'summary'}]}}]})+'\n\n'));
   controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(result)}]},finishReason:'STOP'}],modelVersion:'test-version',usageMetadata:{candidatesTokenCount:100}})+'\n\n'));controller.close();
  }}));
  const r=await runBenchmark(input);assert.equal(r.ok,true);assert.ok(r.firstTextMs>=r.firstEventMs);assert.ok(r.totalMs>=r.firstTextMs);assert.equal(r.servedModel,'test-version');assert.equal(r.raw.includes('summary'),false);
  globalThis.fetch=async()=>new Response('',{status:429});const fail=await runBenchmark(input);assert.equal(fail.ok,false);assert.equal(fail.firstTextMs,null);assert.equal(fail.error,'Provider HTTP 429');assert.equal(JSON.stringify(fail).includes('private-test-key'),false);
 }finally{globalThis.fetch=old;}
});
test('OpenRouter cannot run paid models',async()=>{
 await assert.rejects(()=>runBenchmark({...input,provider:'openrouter',model:'paid/model'}),/Only pinned/);
});
