import { notFound } from "next/navigation";
import { CambridgeTestManager } from "@/components/cambridge-test-manager";
import { listCambridgeBooks, listCambridgeTests } from "@/lib/cambridge";
export default async function Page({ params }: {
    params: Promise<{
        book: string;
    }>;
}) {
    const { book } = await params;
    if (!/^\d{1,4}$/.test(book) || Number(book) < 1)
        notFound();
    if (!(await listCambridgeBooks(false)).some(b => b.bookNumber === Number(book)))
        notFound();
    return <CambridgeTestManager key={book} initialBooks={await listCambridgeBooks(false)} initialTests={await listCambridgeTests(false)} initialBook={Number(book)}/>;
}
