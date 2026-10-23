import { CambridgeTestManager } from "@/components/cambridge-test-manager";
import { listCambridgeTests } from "@/lib/cambridge";
export const metadata={title:"Cambridge management"};
export const dynamic="force-dynamic";
export default async function Page(){return <CambridgeTestManager initialTests={await listCambridgeTests(false)}/>;}
