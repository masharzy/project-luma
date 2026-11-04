// Owner-operated, sequential experiment. No production writes, automatic retry or quota changes.
// Manifest: {cases:[{name,input:{expected,sourceParts,cueCard,clips:[{step,part,question,seconds,key:"/private/original.wav"}]},baseline:{result,usage}}]}
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const require=createRequire(import.meta.url),root=resolve(import.meta.dirname,'../..');
const args=process.argv.slice(2),arg=n=>args[args.indexOf(n)+1];
if(!args.includes('--manifest')||!args.includes('--output'))throw Error('Use --manifest private.json --output /private/run-directory [--dry-run]');
const manifest=JSON.parse(readFileSync(arg('--manifest'),'utf8')),out=resolve(arg('--output'));
if(!Array.isArray(manifest.cases)||manifest.cases.length!==2)throw Error('Supply the two frozen full-test cases');
const dry=args.includes('--dry-run'),key=process.env.OPENROUTER_API_KEY;
if(!dry&&!key)throw Error('Set OPENROUTER_API_KEY privately; no paid calls have run');
if(existsSync(resolve(out,'comparison.json')))throw Error('Choose a fresh output directory; existing experiment is preserved');
mkdirSync(out,{recursive:true,mode:0o700});
const load=(path,dependencies={})=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(resolve(root,path),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id in dependencies?dependencies[id]:require(id),m,m.exports);return m.exports;};
const current=load('src/lib/products/speaking-qa-prompt.ts'),baseline=load('scripts/speaking/baseline-prompt.ts');
const coverage=load('src/lib/products/speaking-coverage.ts');
const provider=load('src/lib/products/speaking-provider.ts',{'server-only':{},'zod':require('zod'),'@/lib/ai-lab/secrets':{getKey:async()=>key},'./speaking-qa-prompt':current,'./speaking-qa-validation':load('src/lib/products/speaking-qa-validation.ts'),'@/lib/evaluation/provider':{speakingModel:'xiaomi/mimo-v2.6-flash'},'./storage':{getPrivate:async p=>readFileSync(p)},'./speaking-audio':{speakingMp3:b=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i','pipe:0','-ar','16000','-ac','1','-b:a','64k','-f','mp3','pipe:1'],{input:b,maxBuffer:12e6})},'./speaking-coverage':coverage});
const nativeFetch=globalThis.fetch;let variant='C',spent=0;
const fx=124.3569,budget=20/fx;
// Conservative reserve: entire published context at input rate plus maximum completion.
const reserve=1050000*.14/1e6+32768*.28/1e6;
const report=[];
const save=()=>writeFileSync(resolve(out,'comparison.json'),JSON.stringify({fx,budgetBdt:20,spentBdt:spent*fx,independentHumanValidation:false,runs:report},null,2),{mode:0o600});
if(!dry){
 const prices=await nativeFetch('https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-flash/endpoints').then(r=>r.json());
 const endpoint=prices.data?.endpoints?.find(p=>p.provider_name==='Xiaomi');
 const p=endpoint?.pricing;
 if(!endpoint||!(endpoint.context_length>0)||endpoint.context_length>1050000)throw Error('Context reserve not verified');
 if(!p||Number(p.prompt)>.14/1e6||Number(p.completion)>.28/1e6)throw Error('Pinned pricing not verified: update budget reserve before running');
}
for(const [i,c] of manifest.cases.entries()){
 if(!c.input?.clips?.length||![1,2,3].every(p=>c.input.clips.some(x=>x.part===p))||new Set(c.input.clips.map(x=>x.step)).size!==c.input.clips.length||c.input.clips.length!==c.input.expected)throw Error('Incomplete fixture');
 for(const clip of c.input.clips){clip.key=resolve(clip.key);if(!existsSync(clip.key))throw Error('Original WAV missing');}
 if(!c.baseline)throw Error('Saved A baseline required; never infer or regrade it');
 report.push({case:c.name,variant:'A',saved:true,...c.baseline});save();
 for(variant of ['B','C']){
  const filename=resolve(out,`${i}-${variant}.json`);
  if(existsSync(filename))throw Error('Output exists: inspect saved results; never repeat a paid call automatically');
  if(!dry&&spent+reserve>budget)throw Error('Budget reserve exhausted; results saved');
  globalThis.fetch=async(url,options)=>{
   if(url!=='https://openrouter.ai/api/v1/chat/completions')throw Error('Unexpected destination');
   const b=JSON.parse(options.body);
   if(variant==='B'){
    const suffix=b.messages[0].content.slice(b.messages[0].content.indexOf('\nINPUT COVERAGE:'));
    b.messages[0].content=baseline.speakingQaPrompt+suffix;
    const a=b.response_format.json_schema.schema.properties.answers.items.properties;
    a.corrections.maxItems=6;a.strengths.maxItems=4;a.pronunciation.maxItems=4;
   }
   if(dry){writeFileSync(resolve(out,`${i}-${variant}-config.json`),JSON.stringify({model:b.model,reasoning:b.reasoning,max_tokens:b.max_tokens,promptVersion:variant==='B'?baseline.speakingQaPromptVersion:current.speakingQaPromptVersion,steps:c.input.clips.map(x=>x.step)},null,2));throw Error('DRY_RUN');}
   return nativeFetch(url,{...options,body:JSON.stringify(b)});
  };
  const start=Date.now();let record;
  try{record={status:'completed',...await provider.assessSpeaking(c.input,{captureRaw:true})};}
  catch(e){record={status:dry?'dry_run':'failed',error:e.message,providerReport:e.providerReport??null};}
  if(record.usage)record.usage.promptVersion=variant==='B'?baseline.speakingQaPromptVersion:current.speakingQaPromptVersion;
  const usage=record.usage??record.providerReport?.usage;
  const cost=usage?.cost;
  record={case:c.name,variant,promptVersion:variant==='B'?baseline.speakingQaPromptVersion:current.speakingQaPromptVersion,elapsedMs:Date.now()-start,...record};
  writeFileSync(filename,JSON.stringify(record,null,2),{mode:0o600});report.push(record);
  if(!dry&&!(typeof cost==='number'&&Number.isFinite(cost)&&cost>=0)){save();throw Error('Unknown billed cost: stopping with raw response preserved');}
  spent+=cost??0;save();
  console.log(JSON.stringify({case:c.name,variant,status:record.status,costBdt:(cost??0)*fx,reasoningTokens:usage?.completion_tokens_details?.reasoning_tokens??null}));
 }
}
globalThis.fetch=nativeFetch;
