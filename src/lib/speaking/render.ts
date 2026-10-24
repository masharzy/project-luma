import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { SpeakingMode,SpeakingSet } from './schema';
import { speakingSteps } from './flow';
export async function renderSpeakingRoom(mode:SpeakingMode,testId:string,questions:SpeakingSet,nonce:string,preview=false){
 let html=await readFile(path.join(process.cwd(),'src/lib/speaking/approved-room.html'),'utf8');
 const controller=await readFile(path.join(process.cwd(),'src/lib/speaking/controller.js'),'utf8');
 const config=JSON.stringify({mode,testId,voiceVersion:createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0,16),questions,steps:speakingSteps(questions),preview}).replace(/</g,'\\u003c');
 html=html.replace(/@import url\([^;]+;/,'').replace('<style>',"<style>@font-face{font-family:Manrope;src:url('/fonts/font-2.woff2') format('woff2');font-display:swap}#answer-downloads{max-height:40vh;overflow:auto}.complete-overlay{position:fixed!important;inset:0!important;z-index:60!important}.live-room .part-tabs{pointer-events:none}").replace('<head>','<head><script>window.LUMA_ROOM_CONFIG='+config+';</script>');
 const start=html.indexOf('const S=['),end=html.indexOf('];\nfunction stepAsks',start);if(start<0||end<0)throw Error('Approved template changed');
 html=html.slice(0,start)+'const S=window.LUMA_ROOM_CONFIG.steps'+html.slice(end+1);
 const position=html.lastIndexOf('updatePart();');html=html.slice(0,position)+controller+'\n'+html.slice(position);
 html=html.replace('About 12 minutes · three parts, like the real test.',mode==='mock'?'Live conversation · Parts 1, 2 and 3.':'Fixed questions · Parts 1, 2 and 3.').replace('The microphone turns on only when you press record.',mode==='mock'?'Your microphone stays live during your answers.':'Listen to each question, then record your answer.').replace('CAMBRIDGE · IELTS SPEAKING · ROOM 01',mode.toUpperCase()+' · IELTS SPEAKING · AI EXAMINER').replace('DESIGN PREVIEW','SPEAKING').replaceAll('Use the demo answer to explore this preview.','You can skip without recording.');
 html=html.replaceAll("if(part===2){$('prep-clock')","if(S[si]?.long){$('prep-clock')").replaceAll("part===2?120:90","S[si]?.long?120:90");
 html=html.replace('async()=>{await dp;after(s)}','async()=>{const token=generation;await dp;if(token===generation)after(s)}');
 html=html.replaceAll('<script',`<script nonce="${nonce}"`).replaceAll('<style',`<style nonce="${nonce}"`);
 return html;
}
