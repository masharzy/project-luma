import 'server-only';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';
import { loadExam } from './store';
import { mockCopyDocument,mockSources } from './mock-sources';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
import { gradeModule } from './result';
export async function mockBuilderData(){const [items,sources,speakingSets]=await Promise.all([
 db().query(`SELECT c.id::text,c.title,c.description,c.access,c.status,c.scheduled_at,c.durations,c.sections,e.starts_at,e.ends_at,e.results_published_at,e.id IS NOT NULL AS frozen,
 (SELECT document->'mockSetup' FROM public.exam_modules WHERE kind='mock' AND parent_id=c.id AND module='writing') AS setup,
 (SELECT count(*)::integer FROM public.mock_registrations WHERE mock_id=c.id) registrations
 FROM public.admin_content c LEFT JOIN public.mock_events e ON e.id=c.id WHERE c.kind='mock' ORDER BY c.created_at DESC`),mockSources(),
 db().query('SELECT id::text,title,cambridge_test_id::text,practice_content_id::text FROM public.speaking_sets WHERE published=true AND document IS NOT NULL ORDER BY title')]);return {items,sources:sources.filter(s=>s.modules.length),speakingSets};}
export async function saveMockBuilder(data:Record<string,unknown>,adminId:string){
 const {title,description,access,sourceKind,sourceId,speakingSetId,scheduledAt}=data;
 const id=data.id==null?null:String(data.id),publish=data.intent==='publish',manual=data.mode==='manual';
 if((id&&!/^\d{1,16}$/.test(id))||typeof title!=='string'||!title.trim()||title.length>180||typeof description!=='string'||description.length>5000||!['free','premium'].includes(String(access))||!['draft','publish'].includes(String(data.intent)))throw new AuthHttpError(400,'Enter a title, description and access level.');
 const old=id?(await db().query("SELECT c.*,e.id IS NOT NULL AS frozen FROM public.admin_content c LEFT JOIN public.mock_events e ON e.id=c.id WHERE c.id=$1 AND c.kind='mock'",[id]))[0]:null;
 if(id&&!old)throw new AuthHttpError(404,'Mock not found');
 if(old?.frozen){
 // Registered candidates keep the booked paper and timetable. Editing its public copy needs no rebuilding.
 await db().query(`WITH changed AS(UPDATE public.admin_content SET title=$2,description=$3,status=$4,updated_at=now() WHERE id=$1 AND kind='mock' RETURNING id) UPDATE public.mock_events SET title=$2,description=$3 WHERE id IN(SELECT id FROM changed)`,[id,title.trim(),description,publish?'published':'draft']);return {id};
 }
 const order=['listening','reading','writing','speaking'];
 const selected=data.modules??old?.sections??order;
 if(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length||!selected.every(m=>order.includes(m)))throw new AuthHttpError(400,'Choose at least one valid module.');
 const modules=order.filter(m=>selected.includes(m));
 const start=typeof scheduledAt==='string'?Date.parse(scheduledAt):NaN;
 if(publish&&(!Number.isFinite(start)||start<=Date.now()))throw new AuthHttpError(400,'Choose a future start time to publish this mock.');
 const times=data.durations as Record<string,unknown>|undefined;const durations={listening:Number(times?.listening??old?.durations?.listening??30),reading:Number(times?.reading??old?.durations?.reading??60),writing:Number(times?.writing??old?.durations?.writing??60)};
 if(Object.entries(durations).some(([m,n])=>modules.includes(m)&&(!Number.isInteger(n)||n<1||n>240)))throw new AuthHttpError(400,'Module times must be 1–240 minutes.');
 const source=!manual&&sourceKind&&sourceId?{kind:String(sourceKind),id:String(sourceId)}:null;
 if(source&&(!['cambridge','practice'].includes(source.kind)||!/^\d{1,16}$/.test(source.id)))throw new AuthHttpError(400,'Choose an existing test.');
 const docs=[];for(const module of ['listening','reading','writing'] as const){
  const {document}=await loadExam(source?.kind as 'cambridge'|'practice'||'mock',source?.id||id||'0',module);const doc=source?mockCopyDocument(document,module):structuredClone(document);doc.durationMinutes=durations[module];
  if(publish&&modules.includes(module)&&(!doc.parts.length||(module==='writing'?(manual?doc.parts.length<1:doc.parts.length!==2):(manual?Number(gradeModule(module,doc,{}).total??0)<1:gradeModule(module,doc,{}).total!==40))))throw new AuthHttpError(400,manual?'Add and save your Listening, Reading and Writing questions before publishing.':'Choose a complete test with Listening, Reading and both Writing tasks.');
  if(publish&&modules.includes(module)&&module==='listening'&&!doc.audioUrl&&!doc.parts.every(p=>p.audio_url))throw new AuthHttpError(400,'The Listening paper needs audio.');docs.push({module,document:doc});
 }
 const bankId=typeof speakingSetId==='string'&&/^\d{1,16}$/.test(speakingSetId)?speakingSetId:null;
 const bank=bankId?(await db().query('SELECT id,document FROM public.speaking_sets WHERE id=$1 AND published=true AND document IS NOT NULL',[bankId]))[0]:null;
 let ownSpeaking:ReturnType<typeof normalizeSpeakingSet>|null=null;if(modules.includes('speaking')&&manual&&data.speakingDocument){if(JSON.stringify(data.speakingDocument).length>50000)throw new AuthHttpError(400,'Speaking questions are too long.');if(publish){try{const raw=data.speakingDocument as any;const clean=(v:any)=>Array.isArray(v)?v.map(x=>String(x).trim()).filter(Boolean):v;ownSpeaking=normalizeSpeakingSet({...raw,part1:clean(raw.part1),part3:clean(raw.part3),rounding:clean(raw.rounding),cueCard:{...raw.cueCard,points:clean(raw.cueCard?.points)}});}catch{throw new AuthHttpError(400,'Complete your Speaking Part 1 questions, cue card and Part 3 questions.');}}}
 if(publish&&modules.includes('speaking')&&!bank&&!ownSpeaking)throw new AuthHttpError(400,'Choose Speaking questions for this test.');
 const setup={modules,mode:manual?'manual':'import',speakingDocument:manual?data.speakingDocument??null:null,sourceKind:source?.kind??null,sourceId:source?.id??null,speakingSetId:bankId};(docs[2].document as any).mockSetup=setup;
 const snapshot:any[]=docs.filter(d=>modules.includes(d.module)).map(d=>({...d,document:{...d.document,mockSetup:undefined}}));
 if(modules.includes('speaking')&&(bank||ownSpeaking)){const set=ownSpeaking||normalizeSpeakingSet(bank!.document);if(set.sourceParts)set.sourceParts=set.sourceParts.map((p,i)=>({...p,title:'Part '+(i+1)}));snapshot.push({module:'speaking',document:{schemaVersion:1,durationMinutes:15,audioUrl:'',parts:[],questions:[],speakingSet:set,speakingSetId:ownSpeaking?undefined:String(bank!.id),untimed:true}});}
 // ends_at marks the timed-paper boundary; a Speaking-only mock has no submission deadline.
 const end=Number.isFinite(start)?new Date(start+Math.max(1000,Object.entries(durations).reduce((n,[m,v])=>n+(modules.includes(m)?v:0),0)*60000)).toISOString():null;
 const rows=await db().query(`WITH created AS(INSERT INTO public.admin_content(kind,title,description,access,status,sections,scheduled_at,durations) SELECT 'mock',$2,$3,$4,$5,$14::jsonb,$6::timestamptz,$7::jsonb WHERE $1::bigint IS NULL RETURNING id),
 changed AS(UPDATE public.admin_content SET title=$2,description=$3,access=$4,status=$5,sections=$14::jsonb,scheduled_at=$6::timestamptz,durations=$7::jsonb,updated_at=now() WHERE id=$1 AND kind='mock' AND NOT EXISTS(SELECT 1 FROM public.mock_events WHERE id=$1) RETURNING id),
 target AS(SELECT id FROM created UNION ALL SELECT id FROM changed),
 saved AS(INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document,updated_by) SELECT 'mock',t.id,d.module,t.id,d.document,$10::uuid FROM target t CROSS JOIN jsonb_to_recordset($8::jsonb) AS d(module text,document jsonb) ON CONFLICT(kind,parent_id,module) DO UPDATE SET document=excluded.document,revision=exam_modules.revision+1,updated_by=excluded.updated_by,updated_at=now() RETURNING parent_id),
 custom_speaking AS(INSERT INTO public.speaking_sets(title,minutes,document,published,updated_by) SELECT left($2||' · Speaking',180),15,$13::jsonb,false,$10::uuid FROM target WHERE $12::boolean AND $13::jsonb IS NOT NULL RETURNING id),
 scheduled AS(INSERT INTO public.mock_events(id,title,description,access,starts_at,ends_at,snapshot,prepared_by) SELECT id,$2,$3,$4,$6::timestamptz,$11::timestamptz,CASE WHEN $13::jsonb IS NOT NULL THEN jsonb_set($9::jsonb,ARRAY[(jsonb_array_length($9::jsonb)-1)::text,'document','speakingSetId'],to_jsonb((SELECT id::text FROM custom_speaking))) ELSE $9::jsonb END,$10::uuid FROM target WHERE $12::boolean AND EXISTS(SELECT 1 FROM saved) RETURNING id)
 SELECT id::text FROM target WHERE NOT $12::boolean OR EXISTS(SELECT 1 FROM scheduled)`,[id,title.trim(),description,access,publish?'published':'draft',Number.isFinite(start)?new Date(start).toISOString():null,JSON.stringify(durations),JSON.stringify(docs),JSON.stringify(snapshot),adminId,end,publish,ownSpeaking?JSON.stringify(ownSpeaking):null,JSON.stringify(modules)]);
 if(!rows.length)throw new AuthHttpError(409,'This mock changed while you were editing. Reload and try again.');return {id:String(rows[0].id)};
}
