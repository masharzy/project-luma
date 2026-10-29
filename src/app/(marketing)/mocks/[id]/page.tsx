import { PageWrap } from '@/components/page-parts';
import { MockRoom } from '@/components/mock-room';
export const metadata={title:'Mock waiting room'};
export default async function Page({params}:{params:Promise<{id:string}>}){return <PageWrap><MockRoom id={(await params).id}/></PageWrap>;}
