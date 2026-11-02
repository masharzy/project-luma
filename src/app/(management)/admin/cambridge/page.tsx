import { CambridgeTestManager } from "@/components/cambridge-test-manager";
import { listCambridgeBooks, listCambridgeTests } from "@/lib/cambridge";
export const metadata = { title: "Cambridge management" };
export const dynamic = "force-dynamic";
export default async function Page() { const [books, tests] = await Promise.all([listCambridgeBooks(false), listCambridgeTests(false)]); return <CambridgeTestManager initialBooks={books} initialTests={tests}/>; }
