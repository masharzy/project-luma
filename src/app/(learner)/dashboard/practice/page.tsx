import {permanentRedirect} from 'next/navigation';
import {legacyPracticeDestination} from '@/lib/practice-routes';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){permanentRedirect(legacyPracticeDestination(await searchParams,'/dashboard/my-tests'));}
