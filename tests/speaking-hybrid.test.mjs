import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const models={speakingTranscriptModel:'stt',speakingLanguageModel:'judge',speakingPronunciationModel:'omni'};
function load(deps={}){
 const m={exports:{}};
 new Function('require','module','exports',ts.transpileModule(readFileSync(new URL('../src/lib/products/speaking-hybrid.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(
  id=>id==='zod'?require(id):id==='./speaking-model'?models:deps[id]??{},m,m.exports);
 return m.exports;
}
const segment=(step,part,start_seconds,end_seconds)=>({step,part,start_seconds,end_seconds,question:'What happened?',seconds:end_seconds-start_seconds,key:'private'});
test('timed sentences and pauses stay within their original answer',()=>{
 const {buildSpeakingEvidence}=load();
 const out=buildSpeakingEvidence([segment(0,1,0,3),segment(7,1,4,9)],[
  {word:'I',start:0.1,end:.3},{word:'went.',start:1.2,end:1.7},{word:'padding',start:3.2,end:3.4},
  {word:'Yes.',start:4.3,end:4.5},
 ]);
 assert.equal(out[0].verbatim,'I went.');
 assert.deepEqual(out[0].pauses,[{start:.3,duration:.9}]);
 assert.deepEqual(out[0].sentenceTimings,[{start:.1,end:1.7,wordCount:2}]);
 assert.equal(out[1].verbatim,'Yes.');
 assert.deepEqual(out[1].pauses,[]);
 assert.deepEqual(out[1].sentenceTimings,[{start:.3,end:.5,wordCount:1}]);
});
for(const pronunciationQa of [false,true])test('split flow keeps language separate and verifies pronunciation evidence (QA '+pronunciationQa+')',async()=>{
 const clip=segment(0,1,0,8);
 const {assessSpeakingHybrid}=load({
  './speaking-audio-pack':{packSpeakingAudio:()=>({audio:Buffer.alloc(50),segments:[clip]})},
  './speaking-audio':{encodeSpeakingPcm:()=>Buffer.alloc(30)},
  './speaking-provider':{finalizeSpeaking:r=>r},
 });
 const old=globalThis.fetch;const requests=[];
 const criterion={band:6,feedback:'An example.',evidence:[{step:0,quote:'goes'}]};
 const response=(content)=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}],usage:{cost:.001}});
 globalThis.fetch=async(_url,opt)=>{
  const body=JSON.parse(opt.body);requests.push(body.model);
  if(body.model==='stt')return Response.json({text:'I goes',words:[{word:'I',start:.5,end:.9},{word:'goes',start:1.2,end:1.7}],usage:{cost:.001}});
  if(body.model==='omni'){
   assert.equal(body.messages[1].content[1].type,'input_audio');
   return response({band:6,feedback:'Part estimate',observations:[
    {step:0,word:'goes',timestamp:1.3,observation:'Clear vowel',kind:'strength'},
    {step:0,word:'invented',timestamp:1.3,observation:'Unsupported',kind:'issue'},
   ]});
  }
  const input=JSON.parse(body.messages[1].content);
  assert.equal(input.answers[0].verbatim,'I goes');
  assert.equal('pronunciation' in input.answers[0],false);
  assert.deepEqual(input.answers[0].sentenceTimings,[{start:.5,end:1.7,wordCount:2}]);
  return response({answers:[{step:0,development:'Say when you go.',grammar_feedback:'Agreement error.',vocabulary_feedback:'Basic vocabulary.',
   corrections:[{original:'goes',corrected:'go',category:'grammar',reason:'Use go with I.'},{original:'invented',corrected:'go',category:'grammar',reason:'Unsupported.'}],strengths:[]}],
   fluency:criterion,lexicalResource:criterion,grammar:criterion,pronunciation:criterion,summary:'Practise agreement.',nextSteps:['Use go with I.']});
 };
 try{
  const {result,usage}=await assessSpeakingHybrid({expected:1,cueCard:null,clips:[clip],pronunciationQa},{providerKey:'fixture-secret',loadAudio:async()=>Buffer.alloc(50,1)});
  assert.deepEqual(requests,pronunciationQa?['stt','omni','judge']:['stt','judge']);
  assert.equal(result.transcripts[0].verbatim,'I goes');
  assert.equal(result.assessmentDetails.answers[0].corrections.length,1);
  assert.equal(result.pronunciation.band,null);
  assert.equal(result.assessmentDetails.answers[0].pronunciation.length,pronunciationQa?1:0);
  assert.equal(usage.cost,pronunciationQa?.003:.002);
 }finally{globalThis.fetch=old;}
});
