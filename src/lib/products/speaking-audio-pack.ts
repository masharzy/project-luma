import { validateSpeakingWav } from './speaking-wav';
/** One lossless audio attachment with explicit question boundaries per Speaking part. */
export function packSpeakingAudio<T extends {step:number;part:number;question:string;seconds:number}>(clips:{clip:T;bytes:Uint8Array}[]){
 if(!clips.length)throw Error('No Speaking recordings submitted');
 const chunks:Buffer[]=[],segments:(T&{start_seconds:number;end_seconds:number})[]=[];
 let offset=0;
 for(const {clip,bytes} of clips){
  const duration=validateSpeakingWav(bytes,183);
  if(chunks.length){chunks.push(Buffer.alloc(32000));offset+=1;}
  segments.push({...clip,start_seconds:offset,end_seconds:offset+duration});
  chunks.push(Buffer.from(bytes).subarray(44));offset+=duration;
 }
 const pcm=Buffer.concat(chunks),header=Buffer.from(clips[0].bytes.subarray(0,44));
 header.writeUInt32LE(pcm.length+36,4);header.writeUInt32LE(pcm.length,40);
 return {audio:Buffer.concat([header,pcm]),segments};
}
