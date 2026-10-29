import { MockManager } from '@/components/mock-manager';
import { mockBuilderData } from '@/lib/exam/mock-builder';
export const dynamic='force-dynamic';
export default async function Page(){return <MockManager initial={await mockBuilderData()}/>;}
