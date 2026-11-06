import { notFound } from "next/navigation";
import Link from "next/link";
import { modules } from "@/config/features";
import { PageIntro, PageWrap, FeatureNote } from "@/components/page-parts";
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
      <PageIntro
        eyebrow={item.name.toUpperCase() + " PRACTICE"}
        title={item.line}
        description={item.description}
      >
        <Link className="text-link" href="/recent-tests">
          ← All modules
        </Link>
      </PageIntro>
      <div className="module-focus">
        <span>
          {item.number} / {item.name.toUpperCase()}
        </span>
        <h2>{item.meta}</h2>
        <p lang="bn">
          নিজের সময়ে শুরু করবে, নিজের গতিতে এগোবে। Published test হলে নিচে দেখতে
          পাবে।
        </p>
      </div>
      <ModuleFilterChips active={module} />
      <PracticeCatalog module={module} page={page} basePath={`/recent-tests/${module}`} />
      <FeatureNote>
        Published module বেছে নিজের সময়ে অনুশীলন শুরু করো।
      </FeatureNote>
    </PageWrap>
  );
}
