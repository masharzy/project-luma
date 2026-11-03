// Never log provider messages, response bodies, submissions, or credentials.
export function evaluationDiagnostic(error:unknown){
 const kinds=new Set(['AI_NoObjectGeneratedError','AI_TypeValidationError','AI_JSONParseError','AI_APICallError','AI_NoOutputGeneratedError','TimeoutError','AbortError','ZodError']);
 const reasons=new Set(['Unsupported correction','Unsupported positive evidence','Assessment task mismatch','Transcript does not match recordings','Provider key is not configured','AI lab encryption is not configured']);
 const chain:Record<string,unknown>[]=[];let current=error;
 for(let i=0;i<4&&current&&typeof current==='object';i++){const e=current as Record<string,unknown>;const item:Record<string,unknown>={kind:typeof e.name==='string'&&kinds.has(e.name)?e.name:'Error'};
 if(typeof e.statusCode==='number')item.status=e.statusCode;
 if(e.statusCode===400){
  const body=String(e.responseBody||'').toLowerCase();
  const labels=['audio','base64','stream','response_format','json','reasoning','thinking','max_tokens','token','size','length','format','invalidparameter','unsupported','messages','modalities','url','data','limit'];
  item.requestHints=labels.filter(label=>body.includes(label));
  let parsed:any;try{parsed=JSON.parse(body)}catch{}
  const raw=parsed?.error?.metadata?.raw;let upstream:any;try{upstream=typeof raw==='string'?JSON.parse(raw):raw}catch{}
  const code=upstream?.error?.code||upstream?.code||parsed?.error?.code;
  if(typeof code==='string'&&/^[a-z0-9_.-]{1,80}$/i.test(code))item.upstreamCode=code;
 }

 if(typeof e.message==='string'&&reasons.has(e.message))item.reason=e.message;
 if(Array.isArray(e.issues))item.issues=e.issues.slice(0,12).map(v=>({code:typeof v?.code==='string'?v.code:'invalid',path:Array.isArray(v?.path)?v.path.filter((p:unknown)=>typeof p==='number'||['tasks','task','scorable','limitation','taskAchievement','coherence','lexicalResource','grammar','corrections','original','improved','reason','category','strengths','nextSteps','summary','band','evidence','feedback','confidence','transcripts','step','verbatim','uncertain','fluency','pronunciation'].includes(String(p))):[]}));
 chain.push(item);current=e.cause;}
 return JSON.stringify({provider:'openrouter',chain});
}
