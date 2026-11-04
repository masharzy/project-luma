import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const load=(path,deps={})=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id in deps?deps[id]:require(id),m,m.exports);return m.exports;};
const coverage=load('../src/lib/products/speaking-coverage.ts');
const prompt=load('../src/lib/products/speaking-qa-prompt.ts');
const band=load('../src/lib/products/speaking-qa-validation.ts');
const provider=load('../src/lib/products/speaking-provider.ts',{'server-only':{},'@/lib/ai-lab/secrets':{getKey:async()=>'test-key'},'./speaking-qa-prompt':prompt,'./speaking-qa-validation':band,'@/lib/evaluation/provider':{speakingModel:'xiaomi/mimo-v2.6-flash'},'./storage':{getPrivate:async()=>new Uint8Array([1,2,3])},'./speaking-audio':{speakingMp3:x=>x},'./speaking-stream':load('../src/lib/products/speaking-stream.ts'),'./speaking-coverage':coverage});
const input={expected:3,cueCard:{},clips:[1,2,3].map((part,step)=>({step,part,question:'Original question '+step,seconds:30,key:'private-'+step}))};
const criterion={band:6,reason:'Practice estimate',evidence:[{step:0,quote:'I went there.',reason:'Supported'}]};
const result={answers:input.clips.map(c=>({step:c.step,verbatim:'I went there.',speech_status:'speech',corrections:[],pronunciation:[],strengths:[],uncertain:[]})),criteria:{grammar:criterion,pronunciation:criterion,lexical_resource:criterion,fluency_coherence:criterion},accent:{description:'Not inferred',intelligibility:'mostly_clear',observations:[]},summary:'Practice',next_steps:[],limitations:[],confidence:'medium'};
test('real provider request keeps every audio/question, enables thinking and stores billed usage and untouched raw response',async()=>{
 const old=globalThis.fetch;let sent;
 globalThis.fetch=async(url,opts)=>{sent=JSON.parse(opts.body);return new Response(JSON.stringify({usage:{cost:.001,completion_tokens_details:{reasoning_tokens:240}},choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]}));};
 try{
  const r=await provider.assessSpeaking(input);
  assert.equal(sent.messages[1].content.filter(c=>c.type==='input_audio').length,3);
  assert.equal(sent.messages[1].content.filter(c=>c.type==='text').length,3);
  assert.equal(sent.reasoning.enabled,true);assert.equal(sent.stream,true);assert.equal(sent.stream_options.include_usage,true);assert.equal(sent.signal,undefined);assert.equal(sent.temperature,undefined);assert.equal(sent.max_tokens,32768);
  assert.equal(r.usage.rawPrimary.usage.completion_tokens_details.reasoning_tokens,240);
  assert.deepEqual(r.result.assessmentDetails,result);assert.equal(r.result.estimatedBand,6);
 }finally{globalThis.fetch=old;}
});
test('truncated but valid JSON is rejected with paid raw usage preserved',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({usage:{cost:.001},choices:[{finish_reason:'length',message:{content:JSON.stringify(result)}}]}));
 try{await assert.rejects(provider.assessSpeaking(input),e=>e.providerReport.failureCode==='INCOMPLETE_MODEL_OUTPUT'&&e.providerReport.usage.cost===.001);}finally{globalThis.fetch=old;}
});
