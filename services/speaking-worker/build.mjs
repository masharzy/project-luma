import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),smoke=process.argv.includes('--audio-smoke');
await build({absWorkingDir:root,entryPoints:[smoke?'src/lib/products/speaking-audio.ts':'services/speaking-worker/server.ts'],outfile:smoke?'services/speaking-worker/dist/audio-smoke.mjs':'services/speaking-worker/dist/worker.mjs',bundle:true,platform:'node',target:'node22',format:'esm',packages:'external',tsconfig:resolve(root,'tsconfig.json'),plugins:[{name:'standalone-speaking',setup(b){
 b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'empty'}));
 b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));
 b.onResolve({filter:/^@\/lib\/evaluation\/provider$/},()=>({path:'speaking-model',namespace:'model'}));
 b.onLoad({filter:/.*/,namespace:'model'},()=>({contents:"export const speakingModel='xiaomi/mimo-v2.6-flash';",loader:'js'}));
}}]});

if(smoke){
 const {speakingMp3}=await import(pathToFileURL(resolve(root,'services/speaking-worker/dist/audio-smoke.mjs')).href);
 const wav=Buffer.alloc(32044);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
 const mp3=speakingMp3(wav);assert(mp3.length>0);assert(mp3[0]===255||mp3.toString('ascii',0,3)==='ID3');console.log('Native Node MP3 smoke passed');
}
