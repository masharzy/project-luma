import {type NextRequest} from 'next/server';
import {productUser,productError} from '@/lib/products/access';
import {AuthHttpError,json,readBody,requireSameOrigin,limitMany} from '@/lib/auth/http';
import {db} from '@/lib/auth/db';
import {parseGoals,resourcePath,resourceCollections} from '@/lib/learner/validation';
export async function POST(req:NextRequest){try{
 requireSameOrigin(req);const user=await productUser();const d=await readBody(req,2048);await limitMany([{key:'learner-preferences:'+user.id,max:40,seconds:60}]);
 if(d.action==='goals'){
  let g;try{g=parseGoals(d);}catch(e){throw new AuthHttpError(400,(e as Error).message);}
  await db().query(`INSERT INTO public.learner_goals(user_id,target_band,exam_date,weekly_target) VALUES($1,$2,$3,$4)
   ON CONFLICT(user_id) DO UPDATE SET target_band=excluded.target_band,exam_date=excluded.exam_date,weekly_target=excluded.weekly_target,updated_at=now()`,[user.id,g.targetBand,g.examDate,g.weeklyTarget]);return json({ok:true});
 }
 if(d.action!=='save'&&d.action!=='remove')throw new AuthHttpError(400,'Unknown action.');
 let path;try{path=resourcePath(d.path);}catch(e){throw new AuthHttpError(400,(e as Error).message);}
 if(d.action==='remove'){await db().query('DELETE FROM public.learner_saved_resources WHERE user_id=$1 AND path=$2',[user.id,path]);return json({ok:true});}
 let title=resourceCollections.find(r=>r.path===path)?.title;
 if(!title){const r=(await db().query("SELECT title FROM public.learning_resources WHERE id=$1 AND status='published' AND access='free'",[path.split('/').pop()]))[0];if(!r)throw new AuthHttpError(404,'Resource unavailable.');title=String(r.title);}
 const rows=await db().query(`INSERT INTO public.learner_saved_resources(user_id,path,title) SELECT $1,$2,$3
 WHERE (SELECT count(*) FROM public.learner_saved_resources WHERE user_id=$1)<100
 ON CONFLICT(user_id,path) DO NOTHING RETURNING path`,[user.id,path,title]);
 if(!rows.length&&!(await db().query('SELECT 1 FROM public.learner_saved_resources WHERE user_id=$1 AND path=$2',[user.id,path])).length)throw new AuthHttpError(409,'You can save up to 100 resources.');return json({ok:true});
 }catch(e){return productError(e);}}
