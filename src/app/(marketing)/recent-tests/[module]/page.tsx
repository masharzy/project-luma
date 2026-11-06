import { notFound } from "next/navigation";
import { modules } from "@/config/features";
import { PageIntro, PageWrap } from "@/components/page-parts";
import { PracticeCatalog } from "@/components/practice-catalog";
import { ModuleFilterChips } from "@/components/module-filter-chips";
import { parsePage } from "@/lib/pagination";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { module } = await params;
  const page = parsePage((await searchParams).page);
  const item = modules.find((m) => m.id === module);
  if (!item) notFound();
  return (
    <PageWrap>
      <PageIntro eyebrow={item.name} title={item.name} crumbs={[{ label: "Recent Tests", href: "/recent-tests" }, { label: item.name }]} />
            <ModuleFilterChips active={module} />
      <PracticeCatalog module={module} page={page} basePath={`/recent-tests/${module}`} />
    </PageWrap>
  );
}
