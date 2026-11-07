import { PracticeTestCards } from '@/components/practice-test-cards';
import { PaginationNav } from '@/components/pagination-nav';
import { db } from '@/lib/auth/db';
import { PRACTICE_PAGE_SIZE } from '@/lib/pagination';
import { readSession } from '@/lib/auth/session';
import { canOpenTest } from '@/lib/learner/test-access';

const MODULE_FILTER = `e.kind='practice' AND e.parent_id=c.id AND c.kind='practice' AND c.book_slug IS NULL AND c.status='published' AND c.sections ? e.module AND e.module IN ('listening','reading','writing') AND e.revision>0 AND jsonb_array_length(e.document->'parts')>0 AND (e.module='writing' OR jsonb_array_length(e.document->'questions')>0)`;

/**
 * Recent Tests listing. Pagination is per *test* (not per module row) so every
 * module of one test stays on a single card. `page` is server-side (LIMIT/OFFSET).
 */
export async function PracticeCatalog({module,page=1,basePath='/recent-tests'}:{module?:string;page?:number;basePath?:string}) {
 const sql=db();
 // A test is listed when it has the requested module, or (unfiltered) a Listening/Reading module.
 const wanted=module?[module]:['listening','reading'];
 const base=`FROM public.recent_tests c JOIN public.exam_modules e ON ${MODULE_FILTER}`;
 const [{count}]=await sql.query(`SELECT count(*)::int AS count FROM (SELECT c.id ${base} GROUP BY c.id HAVING bool_or(e.module = ANY($1::text[]))) t`,[wanted]) as {count:number}[];
 const total=Number(count)||0,pages=Math.max(1,Math.ceil(total/PRACTICE_PAGE_SIZE)),current=Math.min(Math.max(1,page),pages),offset=(current-1)*PRACTICE_PAGE_SIZE;
 const ids=(await sql.query(`SELECT c.id ${base} GROUP BY c.id HAVING bool_or(e.module = ANY($1::text[])) ORDER BY c.id ASC LIMIT $2 OFFSET $3`,[wanted,PRACTICE_PAGE_SIZE,offset]) as {id:string}[]).map(r=>String(r.id));
 const rows=ids.length?await sql.query(`SELECT c.id,c.title,c.description,c.durations,c.access,e.module ${base} WHERE c.id = ANY($1) ORDER BY c.id ASC,e.module`,[ids]) as Record<string,any>[]:[];
 const tests=new Map<string,{title:string;description:string;durations:Record<string,number>;access:string;modules:string[]}>();
 for(const row of rows){const id=String(row.id);if(!tests.has(id))tests.set(id,{title:String(row.title),description:String(row.description),durations:row.durations||{},access:String(row.access),modules:[]});tests.get(id)!.modules.push(String(row.module));}
 const entries=ids.filter(id=>tests.has(id)).map(id=>[id,tests.get(id)!] as const);
 // Premium tests stay listed; they open for a member whose plan or grants cover them.
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const unlocked=await Promise.all(entries.map(([id,t])=>t.access==='premium'?canOpenTest(t.access,userId,{kind:'practice',id}).catch(()=>false):true));
 return <>
  <PracticeTestCards tests={entries.map(([id,t],i)=>({id,...t,access:(unlocked[i]?'free':'premium') as 'free'|'premium'}))} moduleFilter={module} startNumber={offset+1}/>
  {!entries.length&&<p className="lib-empty">Published tests will appear here when ready.<span lang="bn">Test publish হলে এখানে দেখতে পাবে।</span></p>}
  <PaginationNav basePath={basePath} query={{}} page={current} pages={pages} total={total} pageSize={PRACTICE_PAGE_SIZE}/>
 </>;
}
