import { CambridgeTestManager } from "@/components/cambridge-test-manager";
import { listCambridgeBooks, listCambridgeTests } from "@/lib/cambridge";
export const metadata = { title: "Cambridge management" };
export const dynamic = "force-dynamic";
export default async function Page() { return <CambridgeTestManager initialBooks={await listCambridgeBooks(false)} initialTests={await listCambridgeTests(false)}/>; }
