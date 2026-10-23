import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { db } from "@/lib/auth/db";

async function authorized() {
 const session = await readSession();
 return !!session?.user && hasAdminRole(session.user);
}
export async function DELETE(_: Request, {params}: {params:Promise<{id:string}>}) {
 if (!(await authorized())) return Response.json({error:"Forbidden"},{status:403});
 const {id}=await params;
 if (!/^\d+$/.test(id)) return Response.json({error:"Invalid ID"},{status:400});
 await db().query("DELETE FROM public.cambridge_tests WHERE id=$1",[id]);
 return Response.json({ok:true});
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
 if (!(await authorized())) return Response.json({error:"Forbidden"},{status:403});
 const {id}=await params;
 if (!/^\d+$/.test(id)) return Response.json({error:"Invalid ID"},{status:400});
 let data: Record<string,unknown>;
 try {data=await request.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}
 const access=data.access, status=data.status;
 if ((access !== undefined && access !== "free" && access !== "premium") ||
 (status !== undefined && status !== "draft" && status !== "published"))
 return Response.json({error:"Invalid fields"},{status:400});
 const rows=await db().query(
 `UPDATE public.cambridge_tests SET access=COALESCE($2,access),status=COALESCE($3,status),updated_at=now()
 WHERE id=$1 RETURNING id`,[id,access ?? null,status ?? null]);
 return rows.length ? Response.json({ok:true}) : Response.json({error:"Not found"},{status:404});
}
