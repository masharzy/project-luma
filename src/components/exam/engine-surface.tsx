"use client";
import { useEffect, useState, type ReactNode } from "react";
import { setNonce } from "get-nonce";
import { createPortal } from "react-dom";
// Keep full-screen exam styling outside the website/admin shell and its stacking contexts.
export function EngineSurface({ children, nonce, container }: { children: ReactNode; nonce?: string;container?:HTMLElement|null }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (nonce) setNonce(nonce);
    const element = document.createElement("div");
    element.className = "exam-engine";
    element.dataset.examRoot = "";
    const admin = document.querySelector<HTMLElement>(".admin-app");
    let observer: MutationObserver | undefined;
    if (admin && location.pathname.startsWith("/admin")) {
      element.classList.add("admin-editor-surface");
      const sync = () => { element.dataset.theme = admin.dataset.theme || "system"; };
      sync();
      observer = new MutationObserver(sync);
      observer.observe(admin, { attributes: true, attributeFilter: ["data-theme"] });
    }
    const overflow = document.body.style.overflow;
    (container||document.body).appendChild(element);
    document.body.style.overflow = "hidden";
    setHost(element);
    return () => { observer?.disconnect(); element.remove(); document.body.style.overflow = overflow; };
  }, [nonce,container]);
  return host ? createPortal(children, host) : null;
}
