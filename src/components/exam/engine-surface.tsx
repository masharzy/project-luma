"use client";
import { useEffect, useState, type ReactNode } from "react";
import { setNonce } from "get-nonce";
import { createPortal } from "react-dom";
// Keep full-screen exam styling outside the website/admin shell and its stacking contexts.
export function EngineSurface({ children, nonce }: { children: ReactNode; nonce?: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (nonce) setNonce(nonce);
    const element = document.createElement("div");
    element.className = "exam-engine";
    element.dataset.examRoot = "";
    const overflow = document.body.style.overflow;
    document.body.appendChild(element);
    document.body.style.overflow = "hidden";
    setHost(element);
    return () => { element.remove(); document.body.style.overflow = overflow; };
  }, [nonce]);
  return host ? createPortal(children, host) : null;
}
