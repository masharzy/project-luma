import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { db } from "@/lib/auth/db";
import { listCambridgeTests } from "@/lib/cambridge";
import type { CambridgeSection } from "@/lib/cambridge";

async function authorized() {
 const session = await readSession();
 return !!session?.user && hasAdminRole(session.user);
}
const sectionsAllowed = new Set(["listening", "reading", "writing"]);
export async function GET() {
 if (!(await authorized())) return Response.json({error:"Forbidden"},{status:403});
 return Response.json({tests:await listCambridgeTests(false)}, {headers:{"Cache-Control":"no-store"}});
}
export async function POST(request: Request) {
 if (!(await authorized())) return Response.json({error:"Forbidden"},{status:403});
 let payload: Record<string,unknown>;
 try { payload = await request.json(); } catch { return Response.json({error:"Invalid JSON"},{status:400}); }
 const bookNumber = Number(payload.bookNumber), testNumber = Number(payload.testNumber);
 const title = typeof payload.title === "string" ? payload.title.trim() : "";
 const access = payload.access, status = payload.status;
 const sections = payload.sections;
 if (!Number.isSafeInteger(bookNumber) || bookNumber < 1 || bookNumber > 1000 ||
 !Number.isSafeInteger(testNumber) || testNumber < 1 || testNumber > 1000 ||
 title.length > 180 || (access !== "free" && access !== "premium") ||
 (status !== "draft" && status !== "published") ||
 !Array.isArray(sections) || sections.length < 1 || sections.length > 3 ||
 !sections.every(s => typeof s === "string" && sectionsAllowed.has(s)) ||
 new Set(sections).size !== sections.length)
 return Response.json({error:"Invalid Cambridge test fields"},{status:400});
 try {
 const rows = await db().query(
  `INSERT INTO public.cambridge_tests(book_number,test_number,title,access,status,sections)
  VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,
  [bookNumber,testNumber,title || `Test ${testNumber}`,access,status,JSON.stringify(sections as CambridgeSection[])]);
 return Response.json({id:String(rows[0].id)},{status:201});
 } catch (error) {
 if (typeof error === "object" && error && "code" in error && error.code === "23505")
  return Response.json({error:"This test serial already exists in this book."},{status:409});
 throw error;
 }
}
