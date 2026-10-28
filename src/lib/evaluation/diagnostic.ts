// Never log provider messages, response bodies, submissions, or credentials.
export function evaluationDiagnostic(error:unknown){
 const kinds=new Set(['AI_NoObjectGeneratedError','AI_TypeValidationError','AI_JSONParseError','AI_APICallError','AI_NoOutputGeneratedError','TimeoutError','AbortError','ZodError']);
 const reasons=new Set(['Unsupported correction','Unsupported positive evidence','Assessment task mismatch','Transcript does not match recordings','Provider key is not configured','AI lab encryption is not configured']);
 const chain:Record<string,unknown>[]=[];let current=error;
 for(let i=0;i<4&&current&&typeof current==='object';i++){const e=current as Record<string,unknown>;const item:Record<string,unknown>={kind:typeof e.name==='string'&&kinds.has(e.name)?e.name:'Error'};
 if(typeof e.statusCode==='number')item.status=e.statusCode;
 if(typeof e.message==='string'&&reasons.has(e.message))item.reason=e.message;
 if(Array.isArray(e.issues))item.issues=e.issues.slice(0,12).map(v=>({code:typeof v?.code==='string'?v.code:'invalid',path:Array.isArray(v?.path)?v.path.filter((p:unknown)=>typeof p==='number'||['tasks','task','scorable','limitation','taskAchievement','coherence','lexicalResource','grammar','corrections','original','improved','reason','category','strengths','nextSteps','summary','band','evidence','feedback','confidence','transcripts','step','verbatim','uncertain','fluency','pronunciation'].includes(String(p))):[]}));
 chain.push(item);current=e.cause;}
 return {provider:'openrouter',chain};
}
