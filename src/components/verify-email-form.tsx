"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export function VerifyEmailForm({ token, email, initialVerified = false, initialResendAt = 0 }: {
  token?: string; email?: string; initialVerified?: boolean; initialResendAt?: number;
}) {
  const [pending, setPending] = useState(!!token && !initialVerified);
  const [verified, setVerified] = useState(initialVerified);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendAt, setResendAt] = useState(initialResendAt);
  const [seconds, setSeconds] = useState(60);
  const started = useRef(false);
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  useEffect(() => {
    if (!email || verified) return;
    let active = true;
    const check = async () => {
      const result = await authClient.verificationStatus();
      if (!active || !result.data) return;
      setResendAt(result.data.resendAt);
      if (result.data.verified) setVerified(true);
    };
    const timer = window.setInterval(() => void check(), 15000);
    window.addEventListener("focus", check);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", check); };
  }, [email, verified]);
  useEffect(() => {
    if (!token || started.current || initialVerified) return;
    started.current = true;
    void (async () => {
      const result = await authClient.verifyEmail({ token });
      if (result.error) {
        setError(result.error.message);      } else {
        setVerified(true);
        window.history.replaceState(null, "", "/auth/verify-email");
      }
      setPending(false);
    })();
  }, [token, email, initialVerified]);
  async function resend() {
    if (pending || seconds > 0 || verified || !email) return;
    setPending(true); setError(""); setMessage("");
    const result = await authClient.resendVerification();
    if (result.error) setError(result.error.message);
    else {
      setResendAt(result.data?.resendAt ?? Date.now() + 60000);
      setMessage("A new verification link has been sent. Check your inbox and spam folder.");
    }
    const status = await authClient.verificationStatus();
    if (status.data) { setResendAt(status.data.resendAt); setVerified(status.data.verified); }
    setPending(false);
  }
  return <section className="status-section"><div className="status-sheet">
    <span className="eyebrow">YOUR EMAIL / YOUR ACCOUNT</span>
    <h1>{verified ? "Email verified." : pending && token ? "Verifying your email…" : "Check your inbox."}</h1>
    <p lang="bn">{verified ? "তোমার email verification সম্পন্ন হয়েছে। এবার নিজের প্রস্তুতির জায়গায় ফিরে যাও।" : email ? "তোমার account তৈরি হয়েছে। Email-এ পাঠানো verification link-এ ক্লিক করো। Verify না করা পর্যন্ত dashboard খোলা যাবে না।" : "এই link শুধু email verify করে। Dashboard খুলতে নিজের account-এ sign in থাকতে হবে।"}</p>
    {!verified && email && <p><strong>{email}</strong></p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {message && <p role="status" className="success-note">{message}</p>}
    {verified ? <div className="status-actions"><a className="button" href="/dashboard">Access Your Dashboard <span>↗</span></a></div>
      : email ? <div className="status-actions"><button className="button" type="button" onClick={resend} disabled={pending || seconds > 0}>
        {pending ? "Please wait…" : seconds > 0 ? `Resend email in ${seconds}s` : "Resend verification email"}<span>↗</span>
      </button><button className="text-link" type="button" disabled={pending} onClick={async () => {
        const result = await authClient.signOut(); if (!result.error) window.location.assign("/auth/sign-in"); else setError(result.error.message);
      }}>Use another account</button></div>
      : pending ? <p role="status">Please wait…</p> : <Link className="button" href="/auth/sign-in">Sign in to your account <span>↗</span></Link>}
  </div></section>;
}
