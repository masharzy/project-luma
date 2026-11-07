/**
 * Audio-derived delivery metrics for Speaking (no model, no API cost).
 * Input: mono 16 kHz PCM16 WAV as stored by the recorder. Pauses are measured on the ORIGINAL timeline.
 * These are measurements, not IELTS bands: bands need calibration against examiner scores.
 */
const RATE=16000,FRAME=320; // 20 ms

export type SpeakingMetrics={
 seconds:number;speechSeconds:number;speechRatio:number;
 leadingSilence:number;trailingSilence:number;
 pauses:{count:number;ge05:number;ge1:number;ge2:number;total:number;mean:number;longest:number};
 articulationRate:number|null; // estimated syllable nuclei per second of speech time
 pitch:{medianHz:number|null;rangeSemitones:number|null;stdSemitones:number|null;voicedRatio:number};
 energyVariationDb:number|null;
 segments:{start:number;end:number}[];
};

function frames(pcm:Int16Array){
 const n=Math.floor(pcm.length/FRAME),rms=new Float64Array(n);
 for(let i=0;i<n;i++){let s=0;for(let j=0;j<FRAME;j++){const v=pcm[i*FRAME+j]/32768;s+=v*v;}rms[i]=Math.sqrt(s/FRAME);}
 return rms;
}
const pct=(a:ArrayLike<number>,p:number)=>{const s=Array.from(a).sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(p*s.length))]:0;};

/** Autocorrelation F0 for one 40 ms window, 75-400 Hz. Returns null when unvoiced. */
function f0(pcm:Int16Array,start:number){
 const len=640,minLag=Math.floor(RATE/400),maxLag=Math.floor(RATE/75);
 if(start+len+maxLag>pcm.length)return null;
 let e0=0;for(let i=0;i<len;i++){const v=pcm[start+i];e0+=v*v;}
 if(e0<=0)return null;
 let best=0,bestLag=0;
 for(let lag=minLag;lag<=maxLag;lag++){let c=0,e1=0;for(let i=0;i<len;i++){c+=pcm[start+i]*pcm[start+i+lag];e1+=pcm[start+i+lag]*pcm[start+i+lag];}const r=c/Math.sqrt(e0*(e1||1));if(r>best){best=r;bestLag=lag;}}
 return best>=.5?RATE/bestLag:null;
}

export function speakingMetrics(wav:Uint8Array):SpeakingMetrics{
 const b=Buffer.from(wav),pcm=new Int16Array(b.buffer,b.byteOffset+44,Math.floor((b.length-44)/2));
 const seconds=pcm.length/RATE,rms=frames(pcm);
 // Adaptive threshold from the clip itself: noise floor from the quietest 10 % of frames.
 const floor=pct(rms,.1),top=pct(rms,.95),thr=Math.max(floor*3,top*.06,.004);
 let on=Array.from(rms,v=>v>thr);
 // Bridge gaps shorter than 120 ms (stop closures), drop blips shorter than 80 ms.
 const runs=(flags:boolean[])=>{const r:{v:boolean;s:number;e:number}[]=[];let s=0;for(let i=1;i<=flags.length;i++)if(i===flags.length||flags[i]!==flags[s]){r.push({v:flags[s],s,e:i});s=i;}return r;};
 for(const r of runs(on))if(!r.v&&r.e-r.s<6&&r.s>0&&r.e<on.length)for(let i=r.s;i<r.e;i++)on[i]=true;
 for(const r of runs(on))if(r.v&&r.e-r.s<4)for(let i=r.s;i<r.e;i++)on[i]=false;
 const segs=runs(on).filter(r=>r.v).map(r=>({start:r.s*.02,end:r.e*.02}));
 const speechSeconds=segs.reduce((n,s)=>n+s.end-s.start,0);
 const gaps:number[]=[];for(let i=1;i<segs.length;i++)gaps.push(segs[i].start-segs[i-1].end);
 const pauseList=gaps.filter(g=>g>=.25);
 // Syllable nuclei: peaks of the smoothed energy envelope inside speech.
 const env=Array.from(rms,(_,i)=>{let s=0,c=0;for(let j=Math.max(0,i-2);j<=Math.min(rms.length-1,i+2);j++){s+=rms[j];c++;}return s/c;});
 let nuclei=0;for(let i=2;i<env.length-2;i++)if(on[i]&&env[i]>env[i-1]&&env[i]>=env[i+1]&&env[i]>thr*2&&env[i]-Math.min(env[i-2],env[i+2])>thr*.8)nuclei++;
 // Pitch on voiced speech frames (every 3rd frame for speed).
 const hz:number[]=[];let tried=0;
 for(let i=0;i<on.length;i+=3)if(on[i]){tried++;const f=f0(pcm,i*FRAME);if(f)hz.push(f);}
 const st=hz.map(h=>12*Math.log2(h/100)),mean=st.reduce((a,x)=>a+x,0)/(st.length||1);
 const dbs=Array.from(rms).filter((_,i)=>on[i]).map(v=>20*Math.log10(Math.max(v,1e-5))),dm=dbs.reduce((a,x)=>a+x,0)/(dbs.length||1);
 const r1=(x:number)=>Math.round(x*100)/100;
 return {
  seconds:r1(seconds),speechSeconds:r1(speechSeconds),speechRatio:seconds?r1(speechSeconds/seconds):0,
  leadingSilence:r1(segs.length?segs[0].start:seconds),trailingSilence:r1(segs.length?seconds-segs[segs.length-1].end:0),
  pauses:{count:pauseList.length,ge05:gaps.filter(g=>g>=.5).length,ge1:gaps.filter(g=>g>=1).length,ge2:gaps.filter(g=>g>=2).length,total:r1(pauseList.reduce((a,x)=>a+x,0)),mean:pauseList.length?r1(pauseList.reduce((a,x)=>a+x,0)/pauseList.length):0,longest:r1(Math.max(0,...gaps))},
  articulationRate:speechSeconds>1?r1(nuclei/speechSeconds):null,
  pitch:{medianHz:hz.length?Math.round(pct(hz,.5)):null,rangeSemitones:st.length>10?r1(pct(st,.9)-pct(st,.1)):null,stdSemitones:st.length>10?r1(Math.sqrt(st.reduce((a,x)=>a+(x-mean)**2,0)/st.length)):null,voicedRatio:tried?r1(hz.length/tried):0},
  energyVariationDb:dbs.length>10?r1(Math.sqrt(dbs.reduce((a,x)=>a+(x-dm)**2,0)/dbs.length)):null,
  segments:segs.map(s=>({start:r1(s.start),end:r1(s.end)})),
 };
}
