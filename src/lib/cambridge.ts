import "server-only";
import { db } from "@/lib/auth/db";

export type CambridgeSection = "listening" | "reading" | "writing";
export type CambridgeTest = {
 id: string; bookNumber: number; testNumber: number; title: string;
 access: "free" | "premium"; status: "draft" | "published";
 sections: CambridgeSection[];
};
function mapTest(row: Record<string, unknown>): CambridgeTest {
 return { id: String(row.id), bookNumber: Number(row.book_number),
 testNumber: Number(row.test_number), title: String(row.title),
 access: row.access === "premium" ? "premium" : "free",
 status: row.status === "published" ? "published" : "draft",
 sections: Array.isArray(row.sections) ? row.sections.filter(
  (section): section is CambridgeSection => section === "listening" || section === "reading" || section === "writing"
 ) : [] };
}
export async function listCambridgeTests(publishedOnly = true): Promise<CambridgeTest[]> {
 const rows = await db().query(
  `SELECT id,book_number,test_number,title,access,status,sections FROM public.cambridge_tests
   WHERE ($1::boolean=false OR status='published')
   ORDER BY book_number ASC,test_number ASC`, [publishedOnly]);
 return rows.map(mapTest);
}
