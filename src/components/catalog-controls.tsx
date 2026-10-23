"use client";
import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "./page-parts";
import { Icon } from "./ui/icon";
export function CambridgeCatalog() {
  const [query, setQuery] = useState(""),
    [access, setAccess] = useState("all");
  const books = Array.from({ length: 21 }, (_, i) => i + 1).filter(
    (n) =>
      (!query ||
        String(n).includes(query.trim()) ||
        ("cambridge " + n).includes(query.toLowerCase().trim())) &&
      (access === "all" || (access === "free" ? n <= 10 : n > 10)),
  );
  return (
    <>
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="Book access">
          {[
            ["all", "All books"],
            ["free", "Free / 01–10"],
            ["premium", "Premium / 11–21"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={access === id}
              onClick={() => setAccess(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Icon name="search" size={17} />
          <span className="sr-only">Search Cambridge books</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a book…"
            maxLength={50}
          />
        </label>
      </div>
      <p className="catalog-count">
        {books.length} {books.length === 1 ? "book" : "books"} on the shelf{" "}
        <span>Published tests will appear inside each book.</span>
      </p>
      <div className="book-grid">
        {books.map((n) => (
          <Link
            href={"/cambridge/" + n}
            className={`catalog-book ${n > 10 ? "premium-book" : ""}`}
            key={n}
          >
            <div className="book-cover">
              <span>
                CAMBRIDGE
                <br />
                IELTS
              </span>
              <strong>{String(n).padStart(2, "0")}</strong>
              <span>LISTENING / READING</span>
              <span className="book-spine" />
            </div>
            <div className="book-caption">
              <div>
                <h2>Cambridge {n}</h2>
                <span>{n <= 10 ? "Free access" : "Premium access"}</span>
              </div>
              {n > 10 ? <Icon name="lock" size={17} /> : <span>↗</span>}
            </div>
          </Link>
        ))}
      </div>
      {books.length === 0 && (
        <EmptyState
          title="That book isn’t on this shelf."
          description="অন্য book number দিয়ে খুঁজে দেখো, অথবা filter বদলাও।"
        />
      )}
    </>
  );
}
export function EmptyCatalog({
  kind = "practice",
}: {
  kind?:
    | "practice"
    | "mocks"
    | "writing"
    | "ebooks"
    | "blog"
    | "vocabulary"
    | "grammar";
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All");
  const choices =
    kind === "practice"
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
  return (
    <>
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="Filter library">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={filter === choice}
              onClick={() => setFilter(choice)}
            >
              {choice}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Icon name="search" size={17} />
          <span className="sr-only">Search {kind}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
            placeholder="Search the library…"
          />
        </label>
      </div>
      <div className="catalog-empty">
        <div className="list-heading">
          <span>{kind === "mocks" ? "SCHEDULED EXAMS" : "THE COLLECTION"}</span>
          <span>{filter} / 0 published</span>
        </div>
        <EmptyState
          title={title}
          description={
            search
              ? "এই search-এর জন্য published content নেই। অন্য keyword বা filter দিয়ে দেখতে পারো।"
              : kind === "mocks"
                ? "এখনো কোনো mock publish করা হয়নি। Schedule আর registration খুললে এখানেই দেখা যাবে।"
                : "এখনো কোনো content publish করা হয়নি। প্রস্তুত হলে এই collection-এ যুক্ত হবে।"
          }
          icon={kind === "mocks" ? "clock" : "book"}
        />
        {search && (
          <button
            type="button"
            className="clear-filter"
            onClick={() => setSearch("")}
          >
            Clear search ×
          </button>
        )}
      </div>
    </>
  );
}
