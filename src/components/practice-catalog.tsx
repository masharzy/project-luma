import {PracticeTestCards} from '@/components/practice-test-cards';
import { db } from '@/lib/auth/db';
import { objectiveModules } from '@/lib/cambridge-settings';
export async function PracticeCatalog({module}:{module?:string}) {
 const rows=await db().query(`SELECT c.id,c.title,c.description,c.durations,e.module FROM public.admin_content c JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id WHERE c.kind='practice' AND c.book_slug IS NULL AND c.status='published' AND c.access='free' AND c.sections ? e.module AND e.module IN ('listening','reading','writing') AND e.revision>0 AND jsonb_array_length(e.document->'parts')>0 AND (e.module='writing' OR jsonb_array_length(e.document->'questions')>0)
 ORDER BY id ASC,module`);
 const tests=new Map<string,{title:string;description:string;durations:Record<string,number>;modules:string[]}>();
 for(const row of rows){const id=String(row.id);if(!tests.has(id))tests.set(id,{title:String(row.title),description:String(row.description),durations:row.durations||{},modules:[]});tests.get(id)!.modules.push(String(row.module));}
 const entries=[...tests].filter(([,t])=>module?t.modules.includes(module):t.modules.some(m=>objectiveModules.includes(m as 'listening'|'reading')));
 return <><PracticeTestCards tests={entries.map(([id,t])=>({id,...t,access:'free'}))} moduleFilter={module}/>{!entries.length&&<p className="workspace-panel">Published tests will appear here when ready.</p>}</>;
}
