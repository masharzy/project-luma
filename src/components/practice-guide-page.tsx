import Link from "next/link";
import { practiceGuides, type PracticeGuide } from "@/lib/practice-guides";
export function PracticeGuidePage({ guide }: { guide: PracticeGuide }) {
 return <div className="practice-guide container">
  <nav aria-label="Breadcrumb" className="guide-breadcrumb"><Link href="/">Home</Link><span aria-hidden="true"> / </span><Link href="/resources">Resources</Link><span aria-hidden="true"> / </span><span aria-current="page">{guide.title}</span></nav>
  <header className="guide-intro"><span className="eyebrow">PRACTICE & LEARN</span><h1 lang="en">{guide.title}</h1><p lang="bn">{guide.intro}</p><Link className="button" href={guide.href}>{guide.cta} ↗</Link></header>
  <div className="guide-layout"><article className="guide-article" lang="bn">{guide.sections.map((section,index)=><section key={section.title} id={"step-"+(index+1)}><h2 lang="en">{section.title}</h2><p>{section.body}</p>{section.points&&<ul>{section.points.map(point=><li key={point}>{point}</li>)}</ul>}{section.example&&<div className="guide-example"><h3 lang="en">Try this example</h3><p lang="en">{section.example}</p><details><summary lang="en">See the explanation</summary><p>{section.answer}</p></details></div>}</section>)}
  <section className="guide-source"><h2 lang="en">Official test information</h2><p>For the exam format and rules, see the <a href="https://ielts.org/take-a-test/test-types/ielts-academic-test">official IELTS Academic test information</a>. The study suggestions and short examples here are JumpToNine’s own.</p></section></article>
  <aside className="guide-sidebar" aria-label="Related practice"><h2>Put it into practice</h2><Link href="/recent-tests?view=questions">Type Wise Question Practice ↗</Link><Link href="/cambridge">Cambridge library ↗</Link><Link href="/other-books">More Books ↗</Link><h2>Keep learning</h2>{practiceGuides.filter(item=>item.slug!==guide.slug).map(item=><Link key={item.slug} href={"/"+item.slug}>{item.title} →</Link>)}<Link href="/about">About JumpToNine →</Link></aside></div>
 </div>;
}
