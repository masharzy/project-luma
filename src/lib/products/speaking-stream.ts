export type SpeakingEnvelope={id?:string;model?:string;usage?:Record<string,unknown>;choices?:Array<{message?:{content?:string};finish_reason?:string}>;error?:unknown};
/** Keep the final JSON answer intact; collect usage even when it arrives after finish_reason. */
export async function readSpeakingStream(response:Response,onProgress?:(envelope:SpeakingEnvelope)=>Promise<void>){
 if(!response.headers.get('content-type')?.includes('text/event-stream'))return JSON.parse(await response.text()) as SpeakingEnvelope;
 const result:SpeakingEnvelope={choices:[{message:{content:''}}]},decoder=new TextDecoder();
 let pending='';
 const emit=async(line:string)=>{
  if(!line.startsWith('data:'))return;
  const data=line.slice(5).trim();if(!data||data==='[DONE]')return;
  const event=JSON.parse(data);
  if(event.id)result.id=event.id;if(event.model)result.model=event.model;
  if(event.usage)result.usage=event.usage;if(event.error)result.error=event.error;
  const choice=event.choices?.[0];
  if(choice?.delta?.content)result.choices![0].message!.content+=choice.delta.content;
  if(choice?.finish_reason)result.choices![0].finish_reason=choice.finish_reason;
  if(onProgress)await onProgress(result);
 };
 const reader=response.body?.getReader();if(!reader)throw Error('Speaking stream has no body');
 try{
  while(true){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let pos;while((pos=pending.indexOf('\n'))>=0){const line=pending.slice(0,pos).replace(/\r$/,'');pending=pending.slice(pos+1);await emit(line);}}
  pending+=decoder.decode();if(pending.trim())await emit(pending.replace(/\r$/,''));
 }catch(error){throw Object.assign(new Error('Speaking provider stream interrupted',{cause:error}),{partialEnvelope:result});}
 finally{reader.releaseLock();}
 return result;
}
