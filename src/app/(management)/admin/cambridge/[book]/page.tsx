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
    const [books, tests] = await Promise.all([listCambridgeBooks(false), listCambridgeTests(false)]);
    if (!books.some(b => b.bookNumber === Number(book)))
        notFound();
    return <CambridgeTestManager key={book} initialBooks={books} initialTests={tests} initialBook={Number(book)}/>;
}
