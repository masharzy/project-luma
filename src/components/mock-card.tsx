import Link from "next/link";
import { ArrowUpRight, Check, Clock3, Headphones, BookOpenText, PenLine, Mic, Lock } from "lucide-react";
import { mockDay, mockMonth, mockPhase, mockTime, mockWeekday } from "@/lib/mock-phase";

export type MockCardItem = {
  id: string;
  title: string;
  description?: string | null;
  access: string;
  starts_at: string;
  ends_at: string;
  registered_at?: string | null;
  results_published_at?: string | null;
  modules?: string[] | null;
};
const icons = { listening: Headphones, reading: BookOpenText, writing: PenLine, speaking: Mic } as const;
const phaseLabel = { live: "Live now", upcoming: "Upcoming", completed: "Completed" } as const;

/** One mock in the catalog or dashboard. Phase decides the look; the link target keeps the existing rules. */
export function MockCard({ item: e, now, basePath }: { item: MockCardItem; now: number; basePath: "/mocks" | "/dashboard/mocks" }) {
  const phase = mockPhase(e, now), registered = Boolean(e.registered_at), published = Boolean(e.results_published_at);
  const mods = e.modules ?? [];
  const status = published ? "Results published" : registered ? "Registered" : phase === "upcoming" ? "Registration open" : phase === "live" ? "In progress" : "Registration closed";
  const action = published ? "View results"
    : phase === "completed" ? "View details"
    : phase === "live" ? (registered ? "Join / resume" : "View exam")
    : registered ? "View details" : "View & register";
  return (
    <article className={`mk-card mk-${phase}`} aria-labelledby={`mk-${e.id}`}>
      <div className="mk-date" aria-hidden>
        <span>{mockWeekday(e.starts_at)}</span>
        <b>{mockDay(e.starts_at)}</b>
        <span>{mockMonth(e.starts_at)}</span>
      </div>
      <div className="mk-body">
        <div className="mk-meta">
          <span className={`mk-phase mk-phase-${phase}`}>{phase === "live" && <i aria-hidden />}{phaseLabel[phase]}</span>
          <span className="mk-access">{e.access === "premium" ? <><Lock size={11} aria-hidden /> Premium</> : "Free"}</span>
        </div>
        <h2 id={`mk-${e.id}`}>{e.title}</h2>
        <p className="mk-when"><Clock3 size={14} aria-hidden /> {mockTime(e.starts_at)} – {mockTime(e.ends_at)} <small>Bangladesh time</small></p>
        <ul className="mk-modules" aria-label="Modules">
          {mods.map((m) => { const I = icons[m as keyof typeof icons] ?? BookOpenText; return <li key={m}><I size={13} aria-hidden />{m[0].toUpperCase() + m.slice(1)}</li>; })}
        </ul>
      </div>
      <div className="mk-act">
        <span className={`mk-status${registered || published ? " is-on" : ""}`}>{(registered || published) && <Check size={13} aria-hidden />}{status}</span>
        <Link className="lib-btn" href={`${basePath}/${e.id}`}>{action}<ArrowUpRight size={16} aria-hidden /></Link>
      </div>
    </article>
  );
}
