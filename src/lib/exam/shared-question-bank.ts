import 'server-only';
import { db } from '@/lib/auth/db';
import { otherBooks, otherBookSeries } from '@/lib/other-books';
import { AuthHttpError } from '@/lib/auth/http';
import { buildQuestionIndex, loadQuestionIndex, type SourceRow } from './question-type-practice';
export type BankScope={collection?:'all'|'cambridge'|'other-books'|'practice';book?:string;series?:string;keys?:string[]};
export function parseGroupKey(key:string){
 const match=key.match(/^(?:(practice):)?(listening|reading):(\d{1,16}):([a-zA-Z0-9_.:-]{1,150})$/);
 if(!match)throw new AuthHttpError(400,'Invalid question group.');
 return {kind:match[1]?'practice':'cambridge',module:match[2],testId:match[3]};
}
export async function loadSharedQuestionIndex(scope:BankScope={}){
 const collection=scope.collection||'all';
 const selected=scope.keys?.map(parseGroupKey);
 const cambridgeIds=selected?.filter(k=>k.kind==='cambridge').map(k=>k.testId);
 const practiceIds=selected?.filter(k=>k.kind==='practice').map(k=>k.testId);
 const slugs=scope.series?otherBooks.filter(b=>otherBookSeries.find(s=>s.slug===scope.series)?.name===b.series).map(b=>b.slug):null;
 const cambridge=(collection==='all'||collection==='cambridge')&&(!selected||cambridgeIds!.length)
  ?loadQuestionIndex({bookNumber:scope.book?Number(scope.book):undefined,testIds:cambridgeIds}):Promise.resolve([]);
 const practice=(collection==='all'||collection==='practice'||collection==='other-books')&&(!selected||practiceIds!.length)
  ?db().query(`SELECT c.id AS test_id,0 AS book_number,0 AS test_number,'practice' AS kind,c.title AS source_label,c.book_slug,
    e.module,(c.access='premium') AS premium,e.document
    FROM public.admin_content c JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id
    WHERE c.kind='practice' AND c.status='published' AND e.revision>0 AND c.sections ? e.module
      AND e.module IN ('listening','reading')
      AND ($1::text='all' OR ($1='practice' AND c.book_slug IS NULL) OR ($1='other-books' AND c.book_slug IS NOT NULL))
      AND ($2::text IS NULL OR c.book_slug=$2) AND ($3::text[] IS NULL OR c.book_slug=ANY($3))
      AND ($4::bigint[] IS NULL OR c.id=ANY($4)) ORDER BY c.id,e.module`,[collection,collection==='other-books'?scope.book||null:null,slugs,practiceIds||null]).then(rows=>buildQuestionIndex(rows.map(row=>({...row,source_label:row.book_slug?((otherBooks.find(b=>b.slug===row.book_slug)?.series||'Book')+' · '+(otherBooks.find(b=>b.slug===row.book_slug)?.volume||'')+' · '+row.source_label):row.source_label})) as SourceRow[]))
  :Promise.resolve([]);
 const [a,b]=await Promise.all([cambridge,practice]);return [...a,...b];
}
