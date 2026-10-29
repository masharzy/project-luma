import 'server-only';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';
import { loadExam } from './store';
import { mockCopyDocument,mockSources } from './mock-sources';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
import { gradeModule } from './result';
export async function mockBuilderData(){const [items,sources,speakingSets]=await Promise.all([
 db().query(`SELECT c.id::text,c.title,c.description,c.access,c.status,c.scheduled_at,c.durations,e.starts_at,e.ends_at,e.results_published_at,e.id IS NOT NULL AS frozen,
 (SELECT document->'mockSetup' FROM public.exam_modules WHERE kind='mock' AND parent_id=c.id AND module='writing') AS setup,
 (SELECT count(*)::integer FROM public.mock_registrations WHERE mock_id=c.id) registrations
 FROM public.admin_content c LEFT JOIN public.mock_events e ON e.id=c.id WHERE c.kind='mock' ORDER BY c.created_at DESC`),mockSources(),
 db().query('SELECT id::text,title,cambridge_test_id::text,practice_content_id::text FROM public.speaking_sets WHERE published=true AND document IS NOT NULL ORDER BY title')]);return {items,sources:sources.filter(s=>s.modules.length),speakingSets};}
export async function saveMockBuilder(data:Record<string,unknown>,adminId:string){
 const {title,description,access,sourceKind,sourceId,speakingSetId,scheduledAt}=data;
 const id=data.id==null?null:String(data.id),publish=data.intent==='publish';
 if((id&&!/^\d{1,16}$/.test(id))||typeof title!=='string'||!title.trim()||title.length>180||typeof description!=='string'||description.length>5000||!['free','premium'].includes(String(access))||!['draft','publish'].includes(String(data.intent)))throw new AuthHttpError(400,'Enter a title, description and access level.');
 const old=id?(await db().query("SELECT c.*,e.id IS NOT NULL AS frozen FROM public.admin_content c LEFT JOIN public.mock_events e ON e.id=c.id WHERE c.id=$1 AND c.kind='mock'",[id]))[0]:null;
 if(id&&!old)throw new AuthHttpError(404,'Mock not found');
 if(old?.frozen){
 // Registered candidates keep the booked paper and timetable. Editing its public copy needs no rebuilding.
 await db().query(`WITH changed AS(UPDATE public.admin_content SET title=$2,description=$3,status=$4,updated_at=now() WHERE id=$1 AND kind='mock' RETURNING id) UPDATE public.mock_events SET title=$2,description=$3 WHERE id IN(SELECT id FROM changed)`,[id,title.trim(),description,publish?'published':'draft']);return {id};
 }
 const start=typeof scheduledAt==='string'?Date.parse(scheduledAt):NaN;
 if(publish&&(!Number.isFinite(start)||start<=Date.now()))throw new AuthHttpError(400,'Choose a future start time to publish this mock.');
 const times=data.durations as Record<string,unknown>|undefined;const durations={listening:Number(times?.listening??old?.durations?.listening??30),reading:Number(times?.reading??old?.durations?.reading??60),writing:Number(times?.writing??old?.durations?.writing??60)};
 if(Object.values(durations).some(n=>!Number.isInteger(n)||n<1||n>240))throw new AuthHttpError(400,'Module times must be 1–240 minutes.');
 const source=sourceKind&&sourceId?{kind:String(sourceKind),id:String(sourceId)}:null;
 if(source&&(!['cambridge','practice'].includes(source.kind)||!/^\d{1,16}$/.test(source.id)))throw new AuthHttpError(400,'Choose an existing test.');
 const docs=[];for(const module of ['listening','reading','writing'] as const){
  const {document}=await loadExam(source?.kind as 'cambridge'|'practice'||'mock',source?.id||id||'0',module);const doc=mockCopyDocument(document,module);doc.durationMinutes=durations[module];
  if(publish&&(!doc.parts.length||(module==='writing'?doc.parts.length!==2:gradeModule(module,doc,{}).total!==40)))throw new AuthHttpError(400,'Choose a complete test with Listening, Reading and both Writing tasks.');
  if(publish&&module==='listening'&&!doc.audioUrl&&!doc.parts.every(p=>p.audio_url))throw new AuthHttpError(400,'The Listening paper needs audio.');docs.push({module,document:doc});
 }
 const bankId=typeof speakingSetId==='string'&&/^\d{1,16}$/.test(speakingSetId)?speakingSetId:null;
 const bank=bankId?(await db().query('SELECT id,document FROM public.speaking_sets WHERE id=$1 AND published=true AND document IS NOT NULL',[bankId]))[0]:null;
 if(publish&&!bank)throw new AuthHttpError(400,'Choose Speaking questions for this test.');
 const setup={sourceKind:source?.kind??null,sourceId:source?.id??null,speakingSetId:bankId};(docs[2].document as any).mockSetup=setup;
 const snapshot:any[]=docs.map(d=>({...d,document:{...d.document,mockSetup:undefined}}));
 if(bank){const set=normalizeSpeakingSet(bank.document);if(set.sourceParts)set.sourceParts=set.sourceParts.map((p,i)=>({...p,title:'Part '+(i+1)}));snapshot.push({module:'speaking',document:{schemaVersion:1,durationMinutes:15,audioUrl:'',parts:[],questions:[],speakingSet:set,speakingSetId:String(bank.id),untimed:true}});}
 const end=Number.isFinite(start)?new Date(start+Object.values(durations).reduce((n,v)=>n+v,0)*60000).toISOString():null;
 const rows=await db().query(`WITH created AS(INSERT INTO public.admin_content(kind,title,description,access,status,sections,scheduled_at,durations) SELECT 'mock',$2,$3,$4,$5,'["listening","reading","writing","speaking"]'::jsonb,$6::timestamptz,$7::jsonb WHERE $1::bigint IS NULL RETURNING id),
 changed AS(UPDATE public.admin_content SET title=$2,description=$3,access=$4,status=$5,sections='["listening","reading","writing","speaking"]'::jsonb,scheduled_at=$6::timestamptz,durations=$7::jsonb,updated_at=now() WHERE id=$1 AND kind='mock' AND NOT EXISTS(SELECT 1 FROM public.mock_events WHERE id=$1) RETURNING id),
 target AS(SELECT id FROM created UNION ALL SELECT id FROM changed),
 saved AS(INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document,updated_by) SELECT 'mock',t.id,d.module,t.id,d.document,$10::uuid FROM target t CROSS JOIN jsonb_to_recordset($8::jsonb) AS d(module text,document jsonb) ON CONFLICT(kind,parent_id,module) DO UPDATE SET document=excluded.document,revision=exam_modules.revision+1,updated_by=excluded.updated_by,updated_at=now() RETURNING parent_id),
 scheduled AS(INSERT INTO public.mock_events(id,title,description,access,starts_at,ends_at,snapshot,prepared_by) SELECT id,$2,$3,$4,$6::timestamptz,$11::timestamptz,$9::jsonb,$10::uuid FROM target WHERE $12::boolean AND EXISTS(SELECT 1 FROM saved) RETURNING id)
 SELECT id::text FROM target WHERE NOT $12::boolean OR EXISTS(SELECT 1 FROM scheduled)`,[id,title.trim(),description,access,publish?'published':'draft',Number.isFinite(start)?new Date(start).toISOString():null,JSON.stringify(durations),JSON.stringify(docs),JSON.stringify(snapshot),adminId,end,publish]);
 if(!rows.length)throw new AuthHttpError(409,'This mock changed while you were editing. Reload and try again.');return {id:String(rows[0].id)};
}
