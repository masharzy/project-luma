import { MockAdmin } from '@/components/mock-admin';
export default async function Page({params}:{params:Promise<{id:string}>}){return <MockAdmin id={(await params).id}/>;}
