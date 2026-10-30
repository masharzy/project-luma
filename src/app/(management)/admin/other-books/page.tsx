import {ContentManager} from "@/components/content-manager";
import {BookCatalogManager} from "@/components/book-catalog-manager";
import {listContent} from "@/lib/admin/content";
import {listCatalogSeries,listCatalogVolumes} from "@/lib/other-books-registry";
export const dynamic="force-dynamic";
export default async function Page(){
 const [series,volumes,items]=await Promise.all([listCatalogSeries(false),listCatalogVolumes(false),listContent("practice")]);
 return <div className="admin-refactor"><BookCatalogManager initialSeries={series} initialVolumes={volumes}/><ContentManager kind="practice" collection initialItems={items} catalog={volumes.map(v=>({slug:v.slug,series:v.series,volume:v.volume}))}/></div>;
}
