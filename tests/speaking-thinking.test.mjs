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
const pack=load('../src/lib/products/speaking-audio-pack.ts',{'./speaking-wav':load('../src/lib/products/speaking-wav.ts')});
const wav=Buffer.alloc(32044);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
const provider=load('../src/lib/products/speaking-provider.ts',{'server-only':{},'@/lib/ai-lab/secrets':{getKey:async()=>'test-key'},'./speaking-qa-prompt':prompt,'./speaking-qa-validation':band,'./speaking-model':load('../src/lib/products/speaking-model.ts'),'./storage':{getPrivate:async()=>wav},'./speaking-audio-pack':pack,'./speaking-stream':load('../src/lib/products/speaking-stream.ts'),'./speaking-coverage':coverage});
const input={expected:3,cueCard:{},clips:[1,2,3].map((part,step)=>({step,part,question:'Original question '+step,seconds:30,key:'private-'+step}))};
const criterion={band:6,reason:'Practice estimate',evidence:[{step:0,quote:'I went there.',reason:'Supported'}]};
const result={answers:input.clips.map(c=>({step:c.step,verbatim:'I went there.',speech_status:'speech',corrections:[],pronunciation:[],strengths:[],uncertain:[]})),criteria:{grammar:criterion,pronunciation:criterion,lexical_resource:criterion,fluency_coherence:criterion},accent:{description:'Not inferred',intelligibility:'mostly_clear',observations:[]},summary:'Practice',next_steps:[],limitations:[],confidence:'medium'};
test('real provider request keeps every audio/question, enables thinking and stores billed usage and untouched raw response',async()=>{
 const old=globalThis.fetch;let sent;
 globalThis.fetch=async(url,opts)=>{sent=JSON.parse(opts.body);return new Response(JSON.stringify({usage:{cost:.001,completion_tokens_details:{reasoning_tokens:240}},choices:[{finish_reason:'stop',message:{content:JSON.stringify(result)}}]}));};
 try{
  const r=await provider.assessSpeaking(input);
  assert.equal(sent.messages[1].content.filter(c=>c.type==='input_audio').length,1);
  assert.equal(sent.messages[1].content.filter(c=>c.type==='text').length,1);
  const timeline=JSON.parse(sent.messages[1].content[0].text).recordings;assert.deepEqual(timeline.map(c=>[c.step,c.start_seconds,c.end_seconds]),[[0,0,1],[1,2,3],[2,4,5]]);assert.equal(sent.messages[1].content[1].input_audio.format,'wav');
  assert.equal(sent.response_format.type,'json_object');assert.match(sent.messages[0].content,/OUTPUT JSON STRUCTURE:/);assert.equal(sent.model,'google/gemini-3.1-pro-preview');assert.deepEqual(sent.provider.only,['google-ai-studio']);assert.equal(sent.reasoning.enabled,true);assert.equal(sent.stream,true);assert.equal(sent.stream_options.include_usage,true);assert.equal(sent.signal,undefined);assert.equal(sent.temperature,undefined);assert.equal(sent.max_tokens,32768);
  assert.equal(r.usage.rawPrimary.usage.completion_tokens_details.reasoning_tokens,240);
  assert.deepEqual(r.result.assessmentDetails,result);assert.equal(r.result.estimatedBand,6);
 }finally{globalThis.fetch=old;}
});
test('truncated but valid JSON is rejected with paid raw usage preserved',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({usage:{cost:.001},choices:[{finish_reason:'length',message:{content:JSON.stringify(result)}}]}));
 try{await assert.rejects(provider.assessSpeaking(input),e=>e.providerReport.failureCode==='INCOMPLETE_MODEL_OUTPUT'&&e.providerReport.usage.cost===.001);}finally{globalThis.fetch=old;}
});

test('ellipsized quotes and unsupported evidence no longer reject or rewrite the model assessment',async()=>{
 const raw=structuredClone(result);
 raw.answers[0].strengths=[{quote:'I ... there.',why:'Model observation'}];
 raw.answers[1].corrections=[{original:'not in transcript',corrected:'replacement',category:'grammar',reason:'Model claim',confidence:'high'}];
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({usage:{cost:.001},choices:[{finish_reason:'stop',message:{content:JSON.stringify(raw)}}]}));
 try{const r=await provider.assessSpeaking(input);assert.deepEqual(r.result.assessmentDetails,raw);assert.equal(r.result.transcripts.length,3);}finally{globalThis.fetch=old;}
});

test('joined WAV preserves each PCM sample and all question boundaries',()=>{
 const second=Buffer.from(wav);second.writeInt16LE(12345,44);
 const out=pack.packSpeakingAudio([{clip:input.clips[0],bytes:wav},{clip:input.clips[1],bytes:second}]);
 assert.deepEqual(out.audio.subarray(44,32044),wav.subarray(44));
 assert(out.audio.subarray(32044,64044).every(x=>x===0));
 assert.deepEqual(out.audio.subarray(64044),second.subarray(44));
 assert.equal(out.audio.readUInt32LE(40),96000);assert.equal(out.segments[1].question,input.clips[1].question);
});
