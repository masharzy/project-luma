import 'server-only';
import { Mp3Encoder } from '@breezystack/lamejs';
import { validateSpeakingWav as validateWav } from './speaking-wav';

// Keep the original private WAV intact; encode only the provider-bound copy.
export function speakingMp3(wav:Uint8Array){
 validateWav(wav,183);
 return speakingPcmMp3(Buffer.from(wav).subarray(44));
}

// Packed PCM is assembled only from individually validated recordings.
export function speakingPcmMp3(pcm:Buffer){
 const samples=new Int16Array(pcm.length/2);
 for(let i=0;i<samples.length;i++)samples[i]=pcm.readInt16LE(i*2);
 const encoder=new Mp3Encoder(1,16000,64),chunks:Buffer[]=[];
 for(let i=0;i<samples.length;i+=1152){const chunk=encoder.encodeBuffer(samples.subarray(i,i+1152));if(chunk.length)chunks.push(Buffer.from(chunk));}
 const tail=encoder.flush();if(tail.length)chunks.push(Buffer.from(tail));
 return Buffer.concat(chunks);
}
