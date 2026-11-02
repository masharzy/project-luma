import {permanentRedirect,notFound} from 'next/navigation';
import {legacyPracticeDestination} from '@/lib/practice-routes';
export default async function Page({params,searchParams}:{params:Promise<{module:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){const{module}=await params;if(!['listening','reading','writing'].includes(module))notFound();permanentRedirect(legacyPracticeDestination(await searchParams,'/recent-tests/'+module));}
