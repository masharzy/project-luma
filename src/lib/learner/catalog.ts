import 'server-only';
import {cache} from 'react';
import {db} from '@/lib/auth/db';
import {hasPremiumTests,activeGrants} from './test-access';
import {grantCovers} from './content-grants';
export type LearnerTest={id:string;kind:'cambridge'|'practice';title:string;collection:string;access:'free'|'premium';modules:string[];grp?:string|null};
export const learnerCatalog=cache(async(userId:string)=>{
 const [premium,grants,rows]=await Promise.all([hasPremiumTests(userId),activeGrants(userId),db().query(`
 WITH catalog AS (
 SELECT t.id,'cambridge'::text AS kind,t.title,b.title AS collection,
 CASE WHEN b.access='premium' THEN 'premium' ELSE t.access END AS access,t.sections,t.book_number::text AS grp
 FROM public.cambridge_tests t JOIN public.cambridge_books b USING(book_number)
 WHERE t.status='published' AND b.status='published'
 UNION ALL
 SELECT c.id,'practice',c.title,coalesce(v.title,'Practice'),c.access,c.sections,c.book_slug AS grp
 FROM public.admin_content c LEFT JOIN public.book_volumes v ON v.slug=c.book_slug
 LEFT JOIN public.book_series s ON s.slug=v.series_slug
 WHERE c.kind='practice' AND c.status='published'
 AND (c.book_slug IS NULL OR (v.status='published' AND s.status='published'))
 ) SELECT c.id::text,c.kind,c.title,c.collection,c.access,c.grp,
 array_agg(e.module ORDER BY CASE e.module WHEN 'listening' THEN 1 WHEN 'reading' THEN 2 ELSE 3 END) AS modules
 FROM catalog c JOIN public.exam_modules e ON e.kind=c.kind AND e.parent_id=c.id
 WHERE c.sections ? e.module AND e.module IN ('listening','reading','writing')
 AND e.revision>0 AND jsonb_array_length(e.document->'parts')>0
 AND (e.module='writing' OR jsonb_array_length(e.document->'questions')>0)
 GROUP BY c.id,c.kind,c.title,c.collection,c.access,c.grp ORDER BY c.kind,c.collection,c.id
 `)]);
 const tests=rows as LearnerTest[];
 return {premium,included:tests.filter(t=>t.access==='premium'&&(premium||grantCovers(grants,{kind:t.kind,id:t.id,book:t.grp??null}))),free:tests.filter(t=>t.access==='free')};
});
