import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const load=(path,req)=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(req,m,m.exports);return m.exports;};
const {speakingMetrics}=load('../src/lib/products/speaking-metrics.ts',require);
// Synthetic clip: 1 s silence, 2 s voiced tone (150 Hz with syllable-like amplitude bumps), 1.5 s silence, 2 s tone, 0.5 s silence.
function wav(parts){const n=parts.reduce((a,p)=>a+Math.round(p.s*16000),0),b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);let o=44,t=0;for(const p of parts){const k=Math.round(p.s*16000);for(let i=0;i<k;i++,t++){const x=p.hz?Math.sin(2*Math.PI*p.hz*t/16000)*(0.25+0.2*Math.sin(2*Math.PI*4*t/16000)):0;b.writeInt16LE(Math.round(x*32767)+(Math.random()*20-10|0),o);o+=2;}}return b;}
test('pauses are measured on the original timeline, not removed',()=>{
 const m=speakingMetrics(wav([{s:1},{s:2,hz:150},{s:1.5},{s:2,hz:150},{s:.5}]));
 assert.ok(Math.abs(m.seconds-7)<.05);
 assert.ok(Math.abs(m.speechSeconds-4)<.2);
 assert.equal(m.pauses.ge1,1);
 assert.equal(m.pauses.ge2,0);
 assert.ok(Math.abs(m.pauses.longest-1.5)<.15);
 assert.ok(Math.abs(m.leadingSilence-1)<.1);
 assert.ok(m.pitch.medianHz>140&&m.pitch.medianHz<160);
 assert.ok(m.articulationRate>2&&m.articulationRate<6);
});
test('pure silence yields no speech and no pauses',()=>{
 const m=speakingMetrics(wav([{s:3}]));
 assert.equal(m.speechSeconds,0);assert.equal(m.pauses.count,0);assert.equal(m.articulationRate,null);
});
