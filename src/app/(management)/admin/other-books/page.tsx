import {requireAdmin} from '@/lib/auth/guards';
import {AdminBookLibrary} from '@/components/admin-book-library';
import {listContent} from '@/lib/admin/content';
import {listCatalogSeries,listCatalogVolumes} from '@/lib/other-books-registry';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();const [series,volumes,items]=await Promise.all([listCatalogSeries(false),listCatalogVolumes(false),listContent('practice')]);return <AdminBookLibrary series={series} volumes={volumes} items={items}/>}
