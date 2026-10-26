import { notFound } from "next/navigation";
import { PageIntro,PageWrap } from "@/components/page-parts";
import { OtherBooksCatalog } from "@/components/other-books-catalog";
import { otherBooks } from "@/lib/other-books";
import { listOtherBookTests } from "@/lib/other-books-catalog";
import "@/styles/other-books.css";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const book=otherBooks.find(b=>b.slug===slug);if(!book)notFound();return <PageWrap tone="library-page"><PageIntro eyebrow="OTHER BOOKS" title={`${book.series} · ${book.volume}`} description="Choose a module or filter by question type to find your next practice test."/><OtherBooksCatalog initialBook={slug} tests={await listOtherBookTests()}/></PageWrap>;}
