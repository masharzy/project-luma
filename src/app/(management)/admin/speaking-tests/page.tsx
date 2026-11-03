import {requireAdmin} from '@/lib/auth/guards';
import {db} from '@/lib/auth/db';
import {speakingPartCounts} from '@/lib/admin/speaking-library';
import {AdminSpeakingLibrary} from '@/components/admin-speaking-library';
import {listCatalogSeries,listCatalogVolumes} from '@/lib/other-books-registry';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();const [rows,series,volumes]=await Promise.all([db().query('SELECT s.id,s.title,s.minutes,s.published,s.document,c.book_slug,t.book_number,t.test_number FROM public.speaking_sets s LEFT JOIN public.admin_content c ON c.id=s.practice_content_id LEFT JOIN public.cambridge_tests t ON t.id=s.cambridge_test_id ORDER BY s.id DESC'),listCatalogSeries(false),listCatalogVolumes(false)]);return <AdminSpeakingLibrary tests={rows.map(t=>({id:String(t.id),title:String(t.title),minutes:Number(t.minutes),published:Boolean(t.published),bookSlug:t.book_slug as string|null,bookNumber:t.book_number?Number(t.book_number):null,testNumber:t.test_number?Number(t.test_number):null,parts:speakingPartCounts(t.document)}))} series={series} volumes={volumes}/>}
