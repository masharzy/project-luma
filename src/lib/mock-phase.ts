export type MockPhase = "upcoming" | "live" | "completed";

/** Visual/status phase of a scheduled mock. Presentation only — registration and start rules live server-side. */
export function mockPhase(e: { starts_at: string; ends_at: string }, now: number): MockPhase {
  if (new Date(e.starts_at).getTime() > now) return "upcoming";
  return new Date(e.ends_at).getTime() > now ? "live" : "completed";
}

const dhaka = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", ...opts });
export const mockDay = (s: string) => dhaka({ day: "2-digit" }).format(new Date(s));
export const mockMonth = (s: string) => dhaka({ month: "short" }).format(new Date(s));
export const mockWeekday = (s: string) => dhaka({ weekday: "short" }).format(new Date(s));
export const mockTime = (s: string) => dhaka({ hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(s));
export const mockFull = (s: string) => dhaka({ dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
