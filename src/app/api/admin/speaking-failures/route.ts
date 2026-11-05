import {readSession} from '@/lib/auth/session';
import {hasAdminRole} from '@/lib/auth/policy';
import {db} from '@/lib/auth/db';
import {json} from '@/lib/auth/http';

export async function GET(){
 const session=await readSession();
 if(!session||!hasAdminRole(session.user))return json({error:'Forbidden'},403);
 const [row]=await db().query("SELECT count(*)::int AS count FROM public.speaking_evaluations WHERE status='failed'");
 return json({count:row.count});
}
