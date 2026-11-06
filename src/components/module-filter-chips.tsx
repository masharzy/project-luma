import Link from "next/link";

const items = [
  { href: "/recent-tests", label: "All", id: "all" },
  { href: "/recent-tests/listening", label: "Listening", id: "listening" },
  { href: "/recent-tests/reading", label: "Reading", id: "reading" },
  { href: "/recent-tests/writing", label: "Writing", id: "writing" },
] as const;

/** Module filter for the Recent Tests catalog. Each link is a fresh URL, so the page resets to 1. */
export function ModuleFilterChips({ active = "all" }: { active?: string }) {
  return (
    <nav className="lib-filters" aria-label="Filter tests by module">
      <span className="lib-filter-label">Module</span>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} aria-current={item.id === active ? "true" : undefined}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
