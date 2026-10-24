import 'server-only';
import { db } from '@/lib/auth/db';
import { examParent } from '@/lib/exam/store';
import { normalizeSpeakingSet,type SpeakingMode } from './schema';
import { AuthHttpError } from '@/lib/auth/http';
export async function publishedSpeakingSet(mode:SpeakingMode,id:string){
 if(!/^\d{1,16}$/.test(id))throw new AuthHttpError(400,'Choose a speaking test.');
 const parent=await examParent(mode,id);
 if(!parent||parent.status!=='published'||parent.access!=='free')throw new AuthHttpError(404,'Speaking test unavailable.');
 const rows=await db().query('SELECT document FROM public.speaking_tests WHERE kind=$1 AND parent_id=$2 AND published=true',[mode,id]);
 if(!rows[0])throw new AuthHttpError(404,'Speaking questions have not been published for this test.');
 return normalizeSpeakingSet(rows[0].document);
}
export async function publishedSpeakingIds(mode:SpeakingMode){try{const rows=await db().query('SELECT parent_id FROM public.speaking_tests WHERE kind=$1 AND published=true',[mode]);return new Set(rows.map(r=>String(r.parent_id)))}catch(e){if((e as {code?:string}).code==='42P01')return new Set<string>();throw e}}
export async function speakingCatalog(mode:SpeakingMode){try{return mode==='cambridge'?await db().query("SELECT t.id,COALESCE(t.title,'Test '||t.test_number) AS title FROM public.speaking_tests s JOIN public.cambridge_tests t ON t.id=s.parent_id JOIN public.cambridge_books b USING(book_number) WHERE s.kind='cambridge' AND s.published=true AND t.status='published' AND b.status='published' AND t.access='free' AND b.access='free' ORDER BY t.book_number,t.test_number LIMIT 100"):await db().query("SELECT c.id,c.title FROM public.speaking_tests s JOIN public.admin_content c ON c.id=s.parent_id AND c.kind=s.kind WHERE s.kind=$1 AND s.published=true AND c.status='published' AND c.access='free' ORDER BY c.id DESC LIMIT 100",[mode])}catch(e){if((e as {code?:string}).code==='42P01')return [];throw e}}
