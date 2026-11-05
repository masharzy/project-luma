import 'server-only';
import { Mp3Encoder } from '@breezystack/lamejs';
import { validateSpeakingWav as validateWav } from './speaking-wav';

// Keep the original private WAV intact; encode only the provider-bound copy.
export function speakingMp3(wav:Uint8Array){
 validateWav(wav,183);
 const b=Buffer.from(wav),samples=new Int16Array((b.length-44)/2);
 for(let i=0;i<samples.length;i++)samples[i]=b.readInt16LE(44+i*2);
 const encoder=new Mp3Encoder(1,16000,64),chunks:Buffer[]=[];
 for(let i=0;i<samples.length;i+=1152){const chunk=encoder.encodeBuffer(samples.subarray(i,i+1152));if(chunk.length)chunks.push(Buffer.from(chunk));}
 const tail=encoder.flush();if(tail.length)chunks.push(Buffer.from(tail));
 return Buffer.concat(chunks);
}
