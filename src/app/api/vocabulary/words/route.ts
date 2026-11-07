import {readSession} from '@/lib/auth/session';
import {vocabularyDetails} from '@/lib/vocabulary';
export async function GET(request:Request){
 const ids=(new URL(request.url).searchParams.get('ids')||'').split(',').map(Number).filter(n=>Number.isInteger(n)&&n>0).slice(0,40);
 const userId=(await readSession().catch(()=>null))?.user?.id??null;
 const words=await vocabularyDetails(userId,ids);
 return Response.json({words},{headers:{'Cache-Control':'private, no-store'}});
}
