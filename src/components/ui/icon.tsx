type Name =
  | "grid"
  | "book"
  | "headphones"
  | "pen"
  | "clock"
  | "chart"
  | "heart"
  | "settings"
  | "users"
  | "file"
  | "shield"
  | "arrow"
  | "search"
  | "check"
  | "lock";
const paths: Record<Name, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  book: "M3 4h7a3 3 0 0 1 2 1 3 3 0 0 1 2-1h7v16h-7a3 3 0 0 0-2 1 3 3 0 0 0-2-1H3z M12 5v16",
  headphones: "M4 14v-3a8 8 0 0 1 16 0v3 M4 12H2v8h4v-8z M20 12h2v8h-4v-8z",
  pen: "m4 16 12-12 4 4L8 20H4z M13 7l4 4",
  clock: "M12 8v5l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  chart: "M4 3v17h17 M8 15v-4 M13 15V6 M18 15V9",
  heart: "M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6z",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z",
  users:
    "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-3a4 4 0 0 0-4-4",
  file: "M5 2h10l5 5v15H5z M14 2v6h6 M8 12h9 M8 16h9",
  shield: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6z M8 12l3 3 5-6",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  search: "M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M16 16l6 6",
  check: "m5 12 4 4L20 5",
  lock: "M6 10V7a6 6 0 0 1 12 0v3 M4 10h16v12H4z",
};
export function Icon({
  name = "book",
  size = 20,
}: {
  name?: Name;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
