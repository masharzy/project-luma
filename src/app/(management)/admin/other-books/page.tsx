import { ContentManager } from "@/components/content-manager";
import { listContent } from "@/lib/admin/content";
export const dynamic="force-dynamic";
export default async function Page(){return <ContentManager kind="practice" collection initialItems={await listContent("practice")}/>;}
