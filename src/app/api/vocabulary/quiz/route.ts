import {readSession} from '@/lib/auth/session';
import {parseFilters,practiceQuestions} from '@/lib/vocabulary';
export async function GET(request:Request){
 const u=new URL(request.url).searchParams;
 const f=parseFilters(Object.fromEntries(u.entries()));
 const ids=(u.get('ids')||'').split(',').map(Number).filter(n=>Number.isInteger(n)&&n>0).slice(0,200);
 const n=Math.min(20,Math.max(5,Number(u.get('n'))||10));
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 return Response.json({questions:await practiceQuestions(userId,f,n,ids)},{headers:{'Cache-Control':'private, no-store'}});
}
