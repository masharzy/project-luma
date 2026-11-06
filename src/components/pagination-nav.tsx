import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageHref, pageWindow } from "@/lib/pagination";

export function PaginationNav({
  basePath,
  query,
  page,
  pages,
  total,
  pageSize,
}: {
  basePath: string;
  query: Record<string, string | undefined>;
  page: number;
  pages: number;
  total: number;
  pageSize: number;
}) {
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const href = (n: number) => pageHref(basePath, query, n);
  return (
    <nav className="lib-pagination" aria-label="Test pages">
      <p className="lib-page-count" aria-live="polite">
        <strong>
          {from}–{to}
        </strong>{" "}
        / {total} tests
      </p>
      <ul>
        <li>
          {page > 1 ? (
            <Link className="lib-page-step" href={href(page - 1)} rel="prev">
              <ChevronLeft size={16} aria-hidden /> Previous
            </Link>
          ) : (
            <span className="lib-page-step" aria-disabled="true">
              <ChevronLeft size={16} aria-hidden /> Previous
            </span>
          )}
        </li>
        {pageWindow(page, pages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} className="lib-page-gap" aria-hidden>
              …
            </li>
          ) : (
            <li key={n} className="lib-page-num-item">
              <Link
                className="lib-page-num"
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                aria-label={`Page ${n}${n === page ? ", current page" : ""}`}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < pages ? (
            <Link className="lib-page-step" href={href(page + 1)} rel="next">
              Next <ChevronRight size={16} aria-hidden />
            </Link>
          ) : (
            <span className="lib-page-step" aria-disabled="true">
              Next <ChevronRight size={16} aria-hidden />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
