import {headers} from 'next/headers';
import Link from 'next/link';
import {requireUser} from '@/lib/auth/guards';
import {MockRoom} from '@/components/mock-room';
import {notFound} from 'next/navigation';
export const metadata={title:'Mock waiting room'};
export default async function Page({params}:{params:Promise<{id:string}>}){await requireUser();const {id}=await params;const nonce=(await headers()).get('x-nonce')||undefined;if(!/^\d{1,16}$/.test(id))notFound();return <><Link className="study-back-link" href="/dashboard/mocks">← All mock exams</Link><div className="study-mock-room"><MockRoom id={id} nonce={nonce}/></div></>}
