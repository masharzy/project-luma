"use client";
import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "./page-parts";
import { Icon } from "./ui/icon";
import type { CambridgeTest, CambridgeBook } from "@/lib/cambridge";
export function CambridgeCatalog({ tests, books }: {
    tests: CambridgeTest[];
    books: CambridgeBook[];
}) {
    const [query, setQuery] = useState("");
    const [access, setAccess] = useState("all");
    const entries = books.map(book => ({ ...book, number: book.bookNumber, tests: tests.filter(t => t.bookNumber === book.bookNumber) })).filter(book => (!query || book.title.toLowerCase().includes(query.toLowerCase().trim()) || String(book.number).includes(query.trim())) && (access === 'all' || book.access === access));
    return (<>
 <div className="catalog-toolbar">
  <div className="filter-tabs" aria-label="Book access">
  {([["all", "All books"], ["free", "Free"], ["premium", "Premium"]] as const).map(([id, label]) => (<button type="button" key={id} aria-pressed={access === id} onClick={() => setAccess(id)}>{label}</button>))}
  </div>
  <label className="search-field"><Icon name="search" size={17}/>
   <span className="sr-only">Search Cambridge books</span>
   <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a book…" maxLength={50}/>
  </label>
 </div>
 <p className="catalog-count">{entries.length} {entries.length === 1 ? "book" : "books"} on the shelf{" "}
  <span>{tests.length} published tests</span>
 </p>
 <div className="book-grid">
 {entries.map(({ number, title, access: bookAccess, tests: bookTests }) => {
            const premium = bookAccess === "premium";
            const modules = Array.from(new Set(bookTests.flatMap(t => t.sections)));
            return <Link href={"/cambridge/" + number} className={`catalog-book ${premium ? "premium-book" : ""}`} key={number}>
   <div className="book-cover">
   <span>CAMBRIDGE<br />IELTS</span>
   <strong>{String(number).padStart(2, "0")}</strong>
   <span>{modules.map(m => m.toUpperCase()).join(" / ")}</span><span className="book-spine"/>
   </div>
   <div className="book-caption"><div><h2>{title}</h2>
   <span>{bookTests.length} tests · {premium ? "Premium access" : bookTests.some(t => t.access === "premium") ? "Free & Premium" : "Free access"}</span>
   </div>{premium ? <Icon name="lock" size={17}/> : <span>↗</span>}</div>
  </Link>;
        })}
 </div>
 {entries.length === 0 && <EmptyState title="No Cambridge books available." description="এখনো এই filter-এ কোনো published Cambridge test নেই।"/>}
 </>);
}
export function EmptyCatalog({ kind = "practice", }: {
    kind?: "practice" | "mocks" | "writing" | "ebooks" | "blog" | "vocabulary" | "grammar";
}) {
    const [search, setSearch] = useState(""), [filter, setFilter] = useState("All");
    const choices = kind === "practice"
        ? ["All", "Listening", "Reading", "Writing"]
        : kind === "mocks"
            ? ["Upcoming", "Registration open", "Completed"]
            : kind === "writing"
                ? ["All", "Task 1", "Task 2"]
                : kind === "vocabulary"
                    ? ["All", "Academic", "Everyday", "Topic based"]
                    : kind === "grammar"
                        ? ["All", "Sentences", "Tenses", "Accuracy"]
                        : ["All", "Free", "Premium"];
    const title = search
        ? "No matching content yet."
        : kind === "mocks"
            ? "Your next exam day is taking shape."
            : kind === "blog"
                ? "A new page is on its way."
                : "The library is getting ready.";
    return (<>
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="Filter library">
          {choices.map((choice) => (<button key={choice} type="button" aria-pressed={filter === choice} onClick={() => setFilter(choice)}>
              {choice}
            </button>))}
        </div>
        <label className="search-field">
          <Icon name="search" size={17}/>
          <span className="sr-only">Search {kind}</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} placeholder="Search the library…"/>
        </label>
      </div>
      <div className="catalog-empty">
        <div className="list-heading">
          <span>{kind === "mocks" ? "SCHEDULED EXAMS" : "THE COLLECTION"}</span>
          <span>{filter} / 0 published</span>
        </div>
        <EmptyState title={title} description={search
            ? "এই search-এর জন্য published content নেই। অন্য keyword বা filter দিয়ে দেখতে পারো।"
            : kind === "mocks"
                ? "এখনো কোনো mock publish করা হয়নি। Schedule আর registration খুললে এখানেই দেখা যাবে।"
                : "এখনো কোনো content publish করা হয়নি। প্রস্তুত হলে এই collection-এ যুক্ত হবে।"} icon={kind === "mocks" ? "clock" : "book"}/>
        {search && (<button type="button" className="clear-filter" onClick={() => setSearch("")}>
            Clear search ×
          </button>)}
      </div>
    </>);
}
