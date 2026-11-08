import { headers } from 'next/headers';
import { PageWrap, Breadcrumbs } from '@/components/page-parts';
import { MockRoom } from '@/components/mock-room';
export const metadata={title:'Mock waiting room'};
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){const nonce=(await headers()).get('x-nonce')||undefined;return <PageWrap><Breadcrumbs items={[{label:'Mock Exams',href:'/mocks'},{label:'Exam'}]}/><MockRoom id={(await params).id} nonce={nonce}/></PageWrap>;}
