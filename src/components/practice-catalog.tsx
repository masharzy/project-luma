import Link from 'next/link';
import { db } from '@/lib/auth/db';
import { testModuleOrder, objectiveModules } from '@/lib/cambridge-settings';
export async function PracticeCatalog({module}:{module?:string}) {
 const rows=await db().query(`SELECT c.id,c.title,c.description,e.module FROM public.admin_content c JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id WHERE c.kind='practice' AND c.book_slug IS NULL AND c.status='published' AND c.access='free' AND c.sections ? e.module AND e.revision>0 AND jsonb_array_length(e.document->'parts')>0 AND (e.module='writing' OR jsonb_array_length(e.document->'questions')>0)
 UNION ALL SELECT c.id,c.title,c.description,'speaking' AS module FROM public.admin_content c JOIN public.speaking_sets s ON s.practice_content_id=c.id WHERE c.kind='practice' AND c.book_slug IS NULL AND c.status='published' AND c.access='free' AND c.sections ? 'speaking' AND s.published=true AND s.document IS NOT NULL
 ORDER BY id ASC,module`);
 const tests=new Map<string,{title:string;description:string;modules:string[]}>();
 for(const row of rows){const id=String(row.id);if(!tests.has(id))tests.set(id,{title:String(row.title),description:String(row.description),modules:[]});tests.get(id)!.modules.push(String(row.module));}
 const entries=[...tests].filter(([,t])=>module?t.modules.includes(module):t.modules.some(m=>objectiveModules.includes(m as 'listening'|'reading')));
 return <div className="admin-item-grid">{entries.map(([id,t])=><article className="workspace-panel" key={id}><h2>{t.title}</h2>{t.description&&<p>{t.description}</p>}<div className="test-module-grid">{testModuleOrder.filter(m=>t.modules.includes(m)&&(!module||m===module)).map(m=><Link className="test-module-card" key={m} href={'/exam/practice/'+id+'/'+m}>{m[0].toUpperCase()+m.slice(1)}{m==='writing'?' · AI Evaluation':''} ↗</Link>)}</div>{!module&&objectiveModules.every(m=>t.modules.includes(m))&&<Link className="button" href={'/exam/practice/'+id+'/full'}>Start Full Test (LR only) ↗</Link>}</article>)}{!entries.length&&<p className="workspace-panel">Published tests will appear here when ready.</p>}</div>;
}
