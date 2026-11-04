import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const m={exports:{}};
new Function('module','exports',ts.transpileModule(readFileSync(new URL('../src/lib/products/speaking-stream.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);
const {readSpeakingStream}=m.exports;
test('split UTF-8 chunks, keepalives and final usage preserve one exact final answer',async()=>{
 const text=': keepalive\n\ndata: '+JSON.stringify({id:'gen-test',choices:[{delta:{content:'{"text":"বাংলা"}'}}]})+'\n\ndata: '+JSON.stringify({choices:[{finish_reason:'stop',delta:{}}]})+'\n\ndata: '+JSON.stringify({choices:[],usage:{cost:.002,completion_tokens_details:{reasoning_tokens:110}}})+'\n\ndata: [DONE]\n';
 const bytes=new TextEncoder().encode(text);let pos=0;
 const response=new Response(new ReadableStream({pull(c){if(pos>=bytes.length){c.close();return;}c.enqueue(bytes.slice(pos,pos+7));pos+=7;}}),{headers:{'content-type':'text/event-stream'}});
 const checkpoints=[];const out=await readSpeakingStream(response,async p=>checkpoints.push(structuredClone(p)));
 assert.equal(out.id,'gen-test');assert.equal(out.choices[0].message.content,'{"text":"বাংলা"}');assert.equal(out.choices[0].finish_reason,'stop');assert.equal(out.usage.cost,.002);assert.equal(out.usage.completion_tokens_details.reasoning_tokens,110);assert(checkpoints.length>=3);
});
test('interrupted stream carries its generation ID and partial answer for auditing',async()=>{
 let count=0;const response=new Response(new ReadableStream({pull(c){if(count++===0)c.enqueue(new TextEncoder().encode('data: {"id":"gen-partial","choices":[{"delta":{"content":"partial"}}]}\n\n'));else c.error(Error('connection closed'));}}),{headers:{'content-type':'text/event-stream'}});
 await assert.rejects(readSpeakingStream(response),e=>e.partialEnvelope.id==='gen-partial'&&e.partialEnvelope.choices[0].message.content==='partial');
});
