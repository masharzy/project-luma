import { CambridgeTestManager } from "@/components/cambridge-test-manager";
import { listCambridgeTests } from "@/lib/cambridge";
export const metadata={title:"Manage tests"};
export const dynamic="force-dynamic";
export default async function Page(){
 const tests=await listCambridgeTests(false);
 return <CambridgeTestManager initialTests={tests}/>;
}
