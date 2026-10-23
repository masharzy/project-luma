"use client";
import { useEffect, useState } from "react";
type Notice = { id: string; type: "success" | "error" | "info"; message: string };
function emit(type: Notice["type"], message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Notice>("luma-exam-notice", { detail: { id: crypto.randomUUID(), type, message } }));
}
export const toast = { success: (message: string) => emit("success", message), error: (message: string) => emit("error", message), info: (message: string) => emit("info", message) };
export function Toaster(_: { richColors?: boolean }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => {
    const timers = new Set<number>();
    const receive = (event: Event) => {
      const notice = (event as CustomEvent<Notice>).detail;
      setNotices(previous => [...previous.slice(-2), notice]);
      const timer = window.setTimeout(() => { setNotices(previous => previous.filter(n => n.id !== notice.id)); timers.delete(timer); }, 6000);
      timers.add(timer);
    };
    window.addEventListener("luma-exam-notice", receive);
    return () => { window.removeEventListener("luma-exam-notice", receive); timers.forEach(window.clearTimeout); };
  }, []);
  return <div className="exam-notices" aria-live="polite">{notices.map(n => <div key={n.id} className={`exam-notice exam-notice-${n.type}`} role={n.type === "error" ? "alert" : "status"}>{n.message}<button type="button" aria-label="Dismiss notification" onClick={() => setNotices(all => all.filter(i => i.id !== n.id))}>×</button></div>)}</div>;
}
