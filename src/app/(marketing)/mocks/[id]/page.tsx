import { PageWrap, Breadcrumbs } from '@/components/page-parts';
import { MockRoom } from '@/components/mock-room';
export const metadata={title:'Mock waiting room'};
export default async function Page({params}:{params:Promise<{id:string}>}){return <PageWrap><Breadcrumbs items={[{label:'Mock Exams',href:'/mocks'},{label:'Exam'}]}/><MockRoom id={(await params).id}/></PageWrap>;}
