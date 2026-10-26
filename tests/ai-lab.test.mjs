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
test('Gemini request uses documented stream endpoint, headers and model-specific thinking',async()=>{
 const old=globalThis.fetch;let seen;
 try{
  globalThis.fetch=async(url,init)=>{seen={url,headers:init.headers,body:JSON.parse(init.body)};return new Response('',{status:404});};
  await runBenchmark({...input,model:'gemini-3.8-flash',reasoning:'effort',level:'deep'});
  assert.equal(seen.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse');
  assert.equal(seen.headers['x-goog-api-key'],'private-test-key');
  assert.deepEqual(seen.body.generationConfig.thinkingConfig,{thinkingLevel:'MEDIUM'});
  await runBenchmark({...input,model:'gemini-2.5-flash',reasoning:'budget',level:'maximum'});
  assert.deepEqual(seen.body.generationConfig.thinkingConfig,{thinkingBudget:8192});
  await assert.rejects(()=>runBenchmark({...input,model:'gemini-3.8-flash',reasoning:'budget'}),/Unsupported reasoning/);
  await assert.rejects(()=>runBenchmark({...input,model:'gemini-2.5-flash',reasoning:'budget',maxThinking:32768}),/exceeds/);
 }finally{globalThis.fetch=old;}
});
test('Error diagnostics preserve retry time without leaking provider messages or secrets',async()=>{
 const {providerFailure}=mod.exports;
 const d=await providerFailure(new Response(JSON.stringify({error:{message:'Daily quota exceeded private-test-key candidate-private-answer'}}),{status:429,headers:{'retry-after':'60'}}),'private-test-key');
 assert.equal(d.category,'account_quota');assert.equal(d.retryAfterSeconds,60);
 assert.equal(JSON.stringify(d).includes('private-test-key'),false);assert.equal(JSON.stringify(d).includes('candidate-private-answer'),false);
 assert.equal((await providerFailure(new Response('upstream overloaded',{status:429}),'x')).category,'rate_limit');
});
test('OpenRouter pins a zero-price model and passes documented reasoning and routing controls',async()=>{
 const old=globalThis.fetch;let body;
 try{
  globalThis.fetch=async(url,init)=>{
   if(!init?.body)return Response.json({data:[{id:'test/model:free',pricing:{prompt:'0',completion:'0'},supported_parameters:['reasoning']}]});
   body=JSON.parse(init.body);return new Response(JSON.stringify({error:{message:'Provider busy'}}),{status:429,headers:{'retry-after':'20'}});
  };
  const r=await runBenchmark({...input,provider:'openrouter',model:'test/model:free',reasoning:'effort',level:'maximum'});
  assert.equal(body.model,'test/model:free');assert.deepEqual(body.reasoning,{effort:'high',exclude:true});
  assert.equal(body.provider.allow_fallbacks,false);assert.deepEqual(body.provider.max_price,{prompt:0,completion:0});assert.equal(body.provider.require_parameters,true);
  assert.equal(r.diagnostic.retryAfterSeconds,20);assert.equal(r.firstTextMs,null);
 }finally{globalThis.fetch=old;}
});
