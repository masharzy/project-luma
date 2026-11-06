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
const provider=load('../src/lib/products/speaking-provider.ts',{'server-only':{},'@/lib/ai-lab/secrets':{getKey:async()=>'test-key'},'./speaking-qa-prompt':prompt,'./speaking-qa-validation':band,'./speaking-model':load('../src/lib/products/speaking-model.ts'),'./storage':{getPrivate:async()=>wav},'./speaking-audio-pack':pack,'./speaking-stream':load('../src/lib/products/speaking-stream.ts'),'./speaking-coverage':coverage,'./speaking-audio':load('../src/lib/products/speaking-audio.ts',{'server-only':{},'@breezystack/lamejs':await import('@breezystack/lamejs'),'./speaking-wav':load('../src/lib/products/speaking-wav.ts')})});
const input={expected:4,cueCard:{topic:'A book'},clips:[1,1,2,3].map((part,step)=>({step,part,question:'Original question '+step,seconds:30,key:'private-'+step}))};
const fixture=steps=>{
 const text='I went there.';
 const criterion={band:6,reason:'Practice estimate',evidence:[{step:steps[0],quote:text,reason:'Supported',timestamp_seconds:.2}]};
 return {audio_access:'heard',answers:steps.map(step=>({
  step,verbatim:text,speech_status:'speech',corrections:[],pronunciation:[],strengths:[],uncertain:[],
  development:'Name the place and add one reason you visited.',vocabulary_feedback:'Simple and relevant.',
  grammar_feedback:'Accurate past tense.',fluency_feedback:'Steady rhythm.',pronunciation_feedback:'Clear final vowel.',
 })),criteria:{grammar:criterion,pronunciation:criterion,lexical_resource:criterion,fluency_coherence:criterion},
 accent:{description:'Not inferred',intelligibility:'mostly_clear',observations:[]},
 summary:'Practice',next_steps:['Add a concrete detail.'],limitations:[],confidence:'medium'};
};
const envelope=(part,raw,finish_reason='stop')=>({id:'part-'+part,usage:{cost:.001},choices:[{finish_reason,message:{content:JSON.stringify(raw)}}]});
const timeline=body=>{
 const [header,...clips]=body.messages[1].content;
 return {...JSON.parse(header.text),recordings:clips.filter(c=>c.type==='text').map(c=>JSON.parse(c.text))};
};
test('three Gemini production requests run concurrently with separately labeled clips in each request and thinking disabled',async()=>{
 const old=globalThis.fetch;
 const sent=[],release=[];
 globalThis.fetch=async(url,opts)=>{
  const body=JSON.parse(opts.body);
  sent.push(body);
  const {part,recordings}=timeline(body);
  return new Promise(resolve=>{
   release.push(()=>resolve(Response.json(envelope(part,fixture(recordings.map(c=>c.step))))));
   if(release.length===3)release.forEach(fn=>fn());
  });
 };
 try{
  const timeout=AbortSignal.timeout(2000);
  const r=await Promise.race([provider.assessSpeaking(input),new Promise((_,reject)=>timeout.addEventListener('abort',()=>reject(Error('Requests were not parallel')),{once:true}))]);
  assert.equal(sent.length,3);
  assert.deepEqual(sent.map(timeline).sort((a,b)=>a.part-b.part).map(x=>x.recordings.map(c=>c.step)),[[0,1],[2],[3]]);
  for(const body of sent){
   const {steps}=timeline(body);
   assert.equal(body.messages[1].content.length,steps.length*2+1);
   assert(body.messages[1].content.filter(c=>c.type==='input_audio').every(c=>c.input_audio.format==='mp3'));
   assert.equal(body.response_format.type,'json_schema');
   assert.deepEqual(body.response_format.json_schema.schema.properties.answers.items.properties.step.enum,steps);
   assert(!JSON.stringify(body.messages).includes('private-'));
   assert.equal(body.model,'google/gemini-3.8-flash');
   assert.deepEqual(body.provider.only,['Google']);
   assert.equal(body.reasoning.enabled,false);
  }
  assert.equal(r.usage.cost,.003);
  assert.equal(r.result.estimatedBand,6);
  assert.deepEqual(r.result.transcripts.map(a=>a.step),[0,1,2,3]);
  assert.match(r.result.assessmentDetails.answers[0].development,/one reason/);
 }finally{globalThis.fetch=old;}
});
test('keeps raw responses for all parts when a transcript is missing, audio was unheard or output truncated',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async(url,opts)=>{
  const {part,recordings}=timeline(JSON.parse(opts.body)),raw=fixture(recordings.map(c=>c.step));
  if(part===1)raw.answers.pop();
  if(part===2)raw.audio_access='unavailable';
  return Response.json(envelope(part,raw,part===3?'length':'stop'));
 };
 try{
  await assert.rejects(provider.assessSpeakingDirect(input),error=>{
   const report=error.providerReport;
   assert.equal(report.failureCode,'INCOMPLETE_ANSWER_COVERAGE');
   assert.deepEqual(report.parts.map(p=>p.issues),[['missing_step:1'],['audio_not_heard'],['incomplete_model_output']]);
   assert.deepEqual(report.parts.map(p=>p.rawResponse.usage.cost),[.001,.001,.001]);
   return true;
  });
 }finally{globalThis.fetch=old;}
});
test('optional ellipsized strengths can pass but invented grammar corrections hold the result',async()=>{
 const old=globalThis.fetch;
 let wrongCorrection=false;
 globalThis.fetch=async(url,opts)=>{
  const {part,recordings}=timeline(JSON.parse(opts.body)),raw=fixture(recordings.map(c=>c.step));
  raw.answers[0].strengths=[{quote:'I ... there.',why:'Model observation'}];
  if(wrongCorrection&&part===1)raw.answers[0].corrections=[{original:'not in transcript',corrected:'replacement',category:'grammar',reason:'Model claim',confidence:'high'}];
  return Response.json(envelope(part,raw));
 };
 try{
  const r=await provider.assessSpeakingDirect(input);
  assert.equal(r.result.assessmentDetails.answers[0].strengths[0].quote,'I ... there.');
  wrongCorrection=true;
  await assert.rejects(provider.assessSpeakingDirect(input),e=>e.providerReport.parts[0].issues.includes('correction_not_verbatim:0'));
 }finally{globalThis.fetch=old;}
});

test('joined WAV preserves each PCM sample and all question boundaries',()=>{
 const second=Buffer.from(wav);second.writeInt16LE(12345,44);
 const out=pack.packSpeakingAudio([{clip:input.clips[0],bytes:wav},{clip:input.clips[1],bytes:second}]);
 assert.deepEqual(out.audio.subarray(44,32044),wav.subarray(44));
 assert(out.audio.subarray(32044,64044).every(x=>x===0));
 assert.deepEqual(out.audio.subarray(64044),second.subarray(44));
 assert.equal(out.audio.readUInt32LE(40),96000);assert.equal(out.segments[1].question,input.clips[1].question);
});
