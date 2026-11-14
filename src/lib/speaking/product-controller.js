/* Product bridge: persist WAV answers, then enqueue assessment. */
const uploadedClips=new Map();let submittingEvaluation=false;
async function monoWav(blob){
 const Context=window.AudioContext||window.webkitAudioContext;const context=new Context();let decoded;try{decoded=await context.decodeAudioData(await blob.arrayBuffer());}finally{await context.close();}
 const count=Math.ceil(decoded.duration*16000);if(count>1949500)throw Error('This recording is too long to upload. Please record a shorter answer.');
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;const offline=new Offline(1,count,16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering(),pcm=rendered.getChannelData(0),buffer=new ArrayBuffer(44+pcm.length*2),v=new DataView(buffer);
 const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+pcm.length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,pcm.length*2,true);for(let i=0;i<pcm.length;i++){const s=Math.max(-1,Math.min(1,pcm[i]));v.setInt16(44+i*2,s<0?s*32768:s*32767,true);}return new Blob([buffer],{type:'audio/wav'});
}
const uploadingClips=new Map();
async function sendClip(key,blob){const wav=await monoWav(blob);const r=await fetch('/api/products/speaking/recording/'+ROOM.testId+'?step='+key,{method:'POST',headers:{'Content-Type':'audio/wav'},body:wav});if(!r.ok){const d=await r.json().catch(()=>({}));throw Object.assign(Error(d.error||'Unable to save recording.'),{status:r.status});}uploadedClips.set(key,blob);if(ROOM.mockAttemptId)void clipStore.remove(key);}
// One upload per clip at a time: the background queue and the final submit share the same request.
function uploadClip(key,blob){if(uploadedClips.get(key)===blob)return Promise.resolve();const running=uploadingClips.get(key);if(running?.blob===blob)return running.promise;const promise=sendClip(key,blob).finally(()=>{if(uploadingClips.get(key)?.promise===promise)uploadingClips.delete(key);});uploadingClips.set(key,{blob,promise});return promise;}
// Mock only: every answer is also kept in this browser (IndexedDB) until the server has it, so a reload,
// a closed tab or a dropped connection never loses a recording.
const clipStore=(()=>{const name='j9-speaking-clips',open=()=>new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('IndexedDB unavailable'));const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('clips');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const run=(mode,fn)=>open().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('clips',mode),store=tx.objectStore('clips'),req=fn(store);tx.oncomplete=()=>{db.close();resolve(req?.result);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};})).catch(()=>undefined);
 const id=key=>ROOM.testId+':'+key;
 return {put:(key,blob)=>run('readwrite',s=>s.put({blob,type:blob.type,at:Date.now()},id(key))),remove:key=>run('readwrite',s=>s.delete(id(key))),
  all:()=>open().then(db=>new Promise(resolve=>{const out=[],tx=db.transaction('clips','readonly'),req=tx.objectStore('clips').openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return;if(String(c.key).startsWith(ROOM.testId+':'))out.push({key:Number(String(c.key).split(':').pop()),blob:c.value.blob});c.continue();};tx.oncomplete=()=>{db.close();resolve(out);};tx.onerror=()=>{db.close();resolve(out);};})).catch(()=>[])};})();
const practiceNext=next;next=async function(save=true){if(!save)return practiceNext(false);if(phase!=='review'||!recorded.length)return;const epoch=generation,key=si,blob=new Blob(recorded,{type:recorder?.mimeType||'audio/webm'});phase='uploading';$('main-action').disabled=true;action('Saving recording…');try{await uploadClip(key,blob);if(epoch!==generation)return;phase='review';if(deadlineExpired){keepCurrentAnswer();finish();return}practiceNext(true);const answer=answers.get(key);if(answer?.blob)uploadedClips.set(key,answer.blob);}catch(e){if(epoch!==generation)return;phase='review';if(deadlineExpired){keepCurrentAnswer();finish();return}$('main-action').disabled=false;action('Retry save & continue ↗');notify(e.message||'Recording could not be saved. Your audio is still in this tab.');}};
const practiceFinish=finish;finish=function(){practiceFinish();$('complete-text').textContent=answers.size+' answers recorded in this tab. Submit your saved recordings for feedback.';let button=$('submit-speaking-evaluation');if(!button){button=document.createElement('button');button.id='submit-speaking-evaluation';button.className='record-button';$('complete-text').after(button);}button.disabled=false;button.textContent='Submit for evaluation ↗';button.onclick=()=>void submitSpeaking();if(ROOM.mockAttemptId)void submitSpeaking();};
async function submitSpeaking(){if(submittingEvaluation)return;submittingEvaluation=true;const button=$('submit-speaking-evaluation');button.disabled=true;button.textContent='Saving & submitting…';try{if(!ROOM.mockDeadline||speakingNow()<ROOM.mockDeadline+2000)for(const [key,a]of answers)if(a.blob?.size)await uploadClip(key,a.blob);const r=await fetch(ROOM.mockAttemptId?'/api/mocks/speaking/'+ROOM.mockAttemptId:'/api/products/speaking/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:ROOM.testId})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to start evaluation.');if(ROOM.mockAttemptId&&window.parent!==window){window.parent.postMessage({type:'mock-speaking-done'},location.origin);return;}window.location.assign(ROOM.mockAttemptId?'/exam/attempt/'+ROOM.testId:'/speaking-evaluation/results/'+ROOM.testId);}catch(e){notify(e.message||'Please retry.');button.disabled=false;button.textContent='Retry submission ↗';}finally{submittingEvaluation=false;}}
$('exit').onclick=()=>{if(ROOM.mockAttemptId&&window.parent!==window)return;if(phase==='recording'&&!confirm('Leave this room? The current unsaved recording will be lost.'))return;window.location.assign(ROOM.mockAttemptId?'/exam/attempt/'+ROOM.testId:'/speaking-evaluation');};
$('complete-text').textContent='Your recordings can be evaluated after the test.';
if(ROOM.savedSteps?.length)$('saved-count').textContent=ROOM.savedSteps.length+' saved privately';
if(!ROOM.storageReady)notify('Recording storage is not enabled yet. You can practice and download recordings, but uploads are unavailable.');
window.LumaSpeaking.submitForEvaluation=submitSpeaking;

if(ROOM.mockAttemptId){document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('copy',e=>e.preventDefault());document.addEventListener('keydown',e=>{const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;if(e.key==='F12'||(m&&e.shiftKey&&['i','j','c'].includes(k))||(m&&['u','s','p'].includes(k)))e.preventDefault();},true);}
if(ROOM.mockAttemptId){
 // Background upload queue with retry: the exam keeps moving while a clip saves, so a slow or broken connection
 // never blocks the next question. Retries back off (1 s … 15 s) until the shared Speaking deadline.
 const pending=new Map();let pumping=false;
 const savedLabel=()=>{const saved=new Set([...(ROOM.savedSteps||[]),...uploadedClips.keys()]);$('saved-count').textContent=saved.size+' saved'+(pending.size?' · '+pending.size+' saving…':'');};
 const windowOpen=()=>!ROOM.mockDeadline||speakingNow()<ROOM.mockDeadline+2000;
 async function pump(){if(pumping)return;pumping=true;let wait=1000;try{while(pending.size&&windowOpen()){const [key,blob]=pending.entries().next().value;try{await uploadClip(key,blob);if(pending.get(key)===blob)pending.delete(key);wait=1000;}catch(e){if(e?.status===409||e?.status===400||e?.status===413||e?.status===415){pending.delete(key);notify(e.message);continue;}notify('Connection problem — this answer is kept on this device and will be saved automatically.');await new Promise(r=>setTimeout(r,wait));wait=Math.min(15000,wait*2);}savedLabel();}}finally{pumping=false;savedLabel();}}
 const queueClip=(key,blob)=>{pending.delete(key);pending.set(key,blob);void clipStore.put(key,blob);savedLabel();void pump();};
 window.addEventListener('online',()=>void pump());
 next=async function(save=true){if(!save)return practiceNext(false);if(phase!=='review'||!recorded.length)return;const key=si,blob=new Blob(recorded,{type:recorder?.mimeType||'audio/webm'});queueClip(key,blob);practiceNext(true);const answer=answers.get(key);if(answer)answer.blob=blob;};
 const mockSubmit=submitSpeaking;
 submitSpeaking=async function(){const button=$('submit-speaking-evaluation');if(button){button.disabled=true;button.textContent='Saving recordings…';}
  // Wait for the queue (it stops by itself at the deadline), then hand over; the server marks what it has.
  for(const [key,a] of answers)if(a.blob?.size&&uploadedClips.get(key)!==a.blob&&!pending.has(key))queueClip(key,a.blob);
  void pump();while((pending.size||pumping)&&windowOpen())await new Promise(r=>setTimeout(r,300));
  for(const key of [...answers.keys()])if(uploadedClips.has(key))answers.set(key,{...answers.get(key),blob:uploadedClips.get(key)});
  return mockSubmit();};
 window.LumaSpeaking.submitForEvaluation=()=>submitSpeaking();
 // Resume after a reload or a closed browser: clips still on this device are uploaded, and the interview continues
 // after the last answered question instead of starting again from Question 1 (which would overwrite saved answers).
 void clipStore.all().then(local=>{
  const saved=new Set(ROOM.savedSteps||[]);
  for(const c of local){if(saved.has(c.key)){void clipStore.remove(c.key);continue;}if(S[c.key]?.t!=='ask'||!c.blob?.size)continue;answers.set(c.key,{blob:c.blob,notes:'',seconds:0});queueClip(c.key,c.blob);}
  const done=[...saved,...local.map(c=>c.key)].filter(k=>S[k]?.t==='ask');
  if(!done.length||phase!=='welcome')return;
  const from=Math.max(...done)+1;
  if(from>=S.length){finish();return;}
  si=from;part=S[si].p;updatePart();updateSavedCount();savedLabel();
  $('question-meta').textContent='Part '+part;
  $('question').textContent='Welcome back. Your earlier answers are saved. The interview continues from where you stopped.';
  action('Continue speaking test');
 });
}
