"use client";
import { useState } from "react";
import Link from "next/link";
import { EmptyState, WorkspaceHeading } from "./page-parts";
import { Icon } from "./ui/icon";
const configs = {
  questions: {
    eyebrow: "CONTENT / QUESTION BANK",
    title: "Good practice starts here.",
    description:
      "Module আর question type অনুযায়ী প্রশ্নগুলো গুছিয়ে রাখার জায়গা।",
    newLabel: "Draft a question",
    newHref: "/admin/questions/new",
    tabs: ["All questions", "Listening", "Reading", "Writing"],
    cols: ["QUESTION", "MODULE", "TYPE", "ACCESS", "STATUS"],
    empty: "Your question bank is a clean page.",
  },
  tests: {
    eyebrow: "CONTENT / PRACTICE TESTS",
    title: "Build a thoughtful test.",
    description:
      "Question bank থেকে বেছে নিয়ে on-demand practice collection তৈরির জায়গা।",
    newLabel: "Draft a test",
    newHref: "/admin/tests/new",
    tabs: ["All tests", "Draft", "Published"],
    cols: ["TEST NAME", "MODULE", "COLLECTION", "ACCESS", "STATUS"],
    empty: "Your first test starts with a question.",
  },
  mocks: {
    eyebrow: "EXAMS / SCHEDULED MOCKS",
    title: "Plan the next exam day.",
    description:
      "Registration, start time আর synchronized module-এর জন্য mock plan করো।",
    newLabel: "Draft a mock",
    newHref: "/admin/mocks/new",
    tabs: ["All mocks", "Upcoming", "Completed"],
    cols: ["MOCK NAME", "START TIME", "REGISTRATION", "RESULTS", "STATUS"],
    empty: "Nothing on the calendar yet.",
  },
  resources: {
    eyebrow: "CONTENT / LEARNING RESOURCES",
    title: "Put something good on the shelf.",
    description:
      "Writing sample, ebook আর journal article-এর collection গুছিয়ে নাও।",
    newLabel: "Draft a resource",
    newHref: "/admin/resources/new",
    tabs: ["All resources", "Writing", "Ebooks", "Journal"],
    cols: ["TITLE", "CATEGORY", "ACCESS", "UPDATED", "STATUS"],
    empty: "A new shelf, waiting for good pages.",
  },
};
export function AdminList({ kind }: { kind: keyof typeof configs }) {
  const c = configs[kind];
  const [search, setSearch] = useState(""),
    [tab, setTab] = useState(c.tabs[0]);
  return (
    <>
      <WorkspaceHeading
        eyebrow={c.eyebrow}
        title={c.title}
        description={c.description}
      >
        <Link href={c.newHref} className="button">
          {c.newLabel} <span>+</span>
        </Link>
      </WorkspaceHeading>
      <div className="admin-integration-note">
        <span className="status-dot" />
        Content backend not connected. Draft forms export files; they do not
        publish to the site.
      </div>
      <section className="workspace-panel admin-table-panel">
        <div className="catalog-toolbar">
          <div className="filter-tabs" aria-label="Filter content">
            {c.tabs.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Icon name="search" size={16} />
            <span className="sr-only">Search {kind}</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
              placeholder="Search content…"
            />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {c.cols.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={c.cols.length}>
                  <EmptyState
                    title={search ? "No matching content." : c.empty}
                    description="এখনো কোনো record publish করা হয়নি। নতুন draft দিয়ে শুরু করতে পারো।"
                    action={c.newLabel}
                    href={c.newHref}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
