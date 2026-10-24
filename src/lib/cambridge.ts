import "server-only";
import { db } from "@/lib/auth/db";
import { testDefaultDurations as defaultDurations, type TestSection as CambridgeSection } from './cambridge-settings';
export type { CambridgeSection } from './cambridge-settings';
export type CambridgeBook = {
    bookNumber: number;
    title: string;
    access: "free" | "premium";
    status: "draft" | "published" | "archived";
};
export type CambridgeTest = {
    id: string;
    bookNumber: number;
    testNumber: number;
    title: string;
    access: "free" | "premium";
    status: "draft" | "published" | "archived";
    sections: CambridgeSection[];
    durations: Record<CambridgeSection, number>;
};
export async function listCambridgeBooks(publishedOnly = true): Promise<CambridgeBook[]> {
    const rows = await db().query("SELECT * FROM public.cambridge_books WHERE ($1::boolean=false OR status='published') ORDER BY book_number", [publishedOnly]);
    return rows.map(r => ({ bookNumber: Number(r.book_number), title: String(r.title), access: r.access as CambridgeBook['access'], status: r.status as CambridgeBook['status'] }));
}
export async function listCambridgeTests(publishedOnly = true): Promise<CambridgeTest[]> {
    const rows = await db().query(`SELECT t.* FROM public.cambridge_tests t JOIN public.cambridge_books b USING(book_number) WHERE ($1::boolean=false OR (t.status='published' AND b.status='published')) ORDER BY book_number,test_number`, [publishedOnly]);
    return rows.map(r => ({ id: String(r.id), bookNumber: Number(r.book_number), testNumber: Number(r.test_number), title: String(r.title), access: r.access as CambridgeTest['access'], status: r.status as CambridgeTest['status'], sections: Array.isArray(r.sections) ? r.sections : [], durations: { ...defaultDurations, ...r.durations } }));
}
